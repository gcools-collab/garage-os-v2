import type { ImportOutcome } from "@/features/data-readiness";
import type { ControlledImportRepository, PlannedImportOperation } from "../controlled-import";
import type { AtomicImportGateway, ImportBatchResult, ImportCheckpoint, ImportCheckpointRepository } from "./types";
import { assertCheckpointTransition } from "./checkpoint-state";

type QueryResult<T> = PromiseLike<{ data: T | null; error: Readonly<{ message: string; code?: string }> | null }>;
const constraintFromMessage = (message: string): string | null => message.match(/constraint ["']([a-z0-9_]+)["']/i)?.[1] ?? null;
export interface LegacyImportSupabaseClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): QueryResult<readonly Record<string, unknown>[]>;
    };
    upsert(values: Readonly<Record<string, unknown>>, options: Readonly<{ onConflict: string }>): QueryResult<unknown>;
  };
  rpc(name: string, args: Readonly<Record<string, unknown>>): QueryResult<unknown>;
}

const outcome = (value: unknown): ImportOutcome => {
  if (value === "CREATED" || value === "UPDATED" || value === "SKIPPED" || value === "CONFLICT" || value === "FAILED") return value;
  throw new Error("INVALID_IMPORT_RPC_OUTCOME");
};

export class SupabaseControlledImportRepository implements ControlledImportRepository, AtomicImportGateway {
  constructor(private readonly client: LegacyImportSupabaseClient) {}

  async loadExisting(garageId: string) {
    const { data, error } = await this.client.from("legacy_import_records")
      .select("garage_id,source,entity_type,external_id,fingerprint")
      .eq("garage_id", garageId);
    if (error) throw new Error(`LEGACY_LEDGER_READ_FAILED:${error.code ?? "UNKNOWN"}`);
    return (data ?? []).map((row) => ({
      garageId: String(row.garage_id),
      source: row.source as PlannedImportOperation["source"],
      entity: row.entity_type as PlannedImportOperation["entity"],
      externalId: String(row.external_id),
      fingerprint: String(row.fingerprint),
    }));
  }

  async executeAtomicBatch(garageId: string, operations: readonly PlannedImportOperation[]): Promise<ImportBatchResult> {
    if (operations.some((item) => item.garageId !== garageId)) throw new Error("CROSS_TENANT_IMPORT_REJECTED");
    const { data, error } = await this.client.rpc("execute_controlled_legacy_import_batch", {
      p_garage_id: garageId,
      p_operations: operations.map((item) => ({
        source: item.source, entity_type: item.entity, external_id: item.externalId,
        fingerprint: item.fingerprint, target_table: item.targetTable, payload: item.payload,
      })),
    });
    if (error) {
      const constraint = constraintFromMessage(error.message);
      throw new Error(`LEGACY_IMPORT_TRANSACTION_FAILED:${error.code ?? "UNKNOWN"}${constraint ? `:${constraint}` : ""}`);
    }
    if (!Array.isArray(data)) throw new Error("INVALID_IMPORT_RPC_RESPONSE");
    const rows = data as readonly Record<string, unknown>[];
    if (rows.length !== operations.length) throw new Error("IMPORT_RPC_CARDINALITY_MISMATCH");
    return { outcomes: rows.map((row) => outcome(row.outcome)), targetIds: rows.map((row) => typeof row.target_id === "string" ? row.target_id : null) };
  }

  async runInTransaction(operations: readonly PlannedImportOperation[]): Promise<readonly ImportOutcome[]> {
    const garageId = operations[0]?.garageId;
    if (!garageId) return [];
    return (await this.executeAtomicBatch(garageId, operations)).outcomes;
  }
}

export class SupabaseImportCheckpointRepository implements ImportCheckpointRepository {
  constructor(private readonly client: LegacyImportSupabaseClient, private readonly executionId: string) {}

  async get(garageId: string): Promise<ImportCheckpoint | null> {
    const { data, error } = await this.client.from("legacy_import_checkpoints")
      .select("execution_id,checkpoint")
      .eq("garage_id", garageId);
    if (error) throw new Error(`CHECKPOINT_READ_FAILED:${error.code ?? "UNKNOWN"}`);
    const row = (data ?? []).find((item) => item.execution_id === this.executionId);
    return typeof row?.checkpoint === "string" ? row.checkpoint as ImportCheckpoint : null;
  }

  async advance(garageId: string, expectedCurrent: ImportCheckpoint | null, next: ImportCheckpoint): Promise<void> {
    assertCheckpointTransition(expectedCurrent, next);
    const { error } = await this.client.rpc("advance_legacy_import_checkpoint", {
      p_garage_id: garageId, p_execution_id: this.executionId, p_expected: expectedCurrent, p_next: next,
    });
    if (error) throw new Error(`CHECKPOINT_ADVANCE_FAILED:${error.code ?? "UNKNOWN"}`);
  }
}
