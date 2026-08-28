import { classifyImportCandidate } from "@/features/data-readiness";
import type { ImportOutcome } from "@/features/data-readiness";

export const CONTROLLED_IMPORT_PHASES = [
  "MIGRATIONS", "RESET_DRY_RUN", "RESET_COMMIT", "CUSTOMERS", "CUSTOMER_VEHICLES",
  "VEHICLES", "APPOINTMENTS", "HISTORICAL_PAYMENTS", "LEADS", "MEDIA_REFERENCES", "RELATIONS", "VERIFY",
] as const;

export type ControlledImportEntity = "CUSTOMER" | "CUSTOMER_VEHICLE" | "VEHICLE" | "APPOINTMENT" | "HISTORICAL_PAYMENT" | "LEAD" | "MEDIA_REFERENCE";
export type ControlledImportSource = "WORDPRESS" | "WOOCOMMERCE" | "YITH" | "ELEMENTOR";
export type ControlledImportOperation = Readonly<{
  garageId: string; source: ControlledImportSource; entity: ControlledImportEntity; externalId: string;
  fingerprint: string; targetTable: string; payload: Readonly<Record<string, unknown>>;
}>;
export type ExistingImportRecord = Readonly<{ garageId: string; source: ControlledImportSource; externalId: string; fingerprint: string; entity: ControlledImportEntity }>;
export type PlannedImportOperation = ControlledImportOperation & Readonly<{ outcome: ImportOutcome }>;
export type ControlledImportReport = Readonly<{ garageId: string; mode: "PREFLIGHT" | "COMMIT"; results: Readonly<Record<ImportOutcome, number>>; databaseMutations: number; storageMutations: 0 }>;

export interface ControlledImportRepository {
  runInTransaction(operations: readonly PlannedImportOperation[]): Promise<readonly ImportOutcome[]>;
}

export function buildControlledImportPlan(operations: readonly ControlledImportOperation[], existing: readonly ExistingImportRecord[]): readonly PlannedImportOperation[] {
  return operations.map((operation) => {
    const comparable = existing.filter((record) => record.entity === operation.entity).map((record) => ({ ...record, payload: {} }));
    const outcome = classifyImportCandidate({ garageId: operation.garageId, source: operation.source, externalId: operation.externalId, fingerprint: operation.fingerprint, payload: operation.payload }, comparable);
    return { ...operation, outcome };
  });
}

const summarize = (outcomes: readonly ImportOutcome[]): Readonly<Record<ImportOutcome, number>> => ({
  CREATED: outcomes.filter((value) => value === "CREATED").length,
  UPDATED: outcomes.filter((value) => value === "UPDATED").length,
  SKIPPED: outcomes.filter((value) => value === "SKIPPED").length,
  CONFLICT: outcomes.filter((value) => value === "CONFLICT").length,
  FAILED: outcomes.filter((value) => value === "FAILED").length,
});

export function preflightControlledImport(garageId: string, plan: readonly PlannedImportOperation[]): ControlledImportReport {
  if (plan.some((operation) => operation.garageId !== garageId)) throw new Error("Cross-tenant import operation detected.");
  return { garageId, mode: "PREFLIGHT", results: summarize(plan.map((item) => item.outcome)), databaseMutations: 0, storageMutations: 0 };
}

export async function executeControlledImport(input: {
  readonly garageId: string; readonly plan: readonly PlannedImportOperation[]; readonly repository: ControlledImportRepository;
  readonly confirmation: string | undefined; readonly resetCompletedBeforeCustomerImport: boolean;
}): Promise<ControlledImportReport> {
  if (process.env.NODE_ENV === "production") throw new Error("Legacy import execution is disabled in production.");
  if (process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT !== "true") throw new Error("Legacy import execution is disabled.");
  if (input.confirmation !== `IMPORT:${input.garageId}`) throw new Error("Explicit legacy import confirmation is missing.");
  if (!input.resetCompletedBeforeCustomerImport) throw new Error("The controlled reset must complete before customer import.");
  if (input.plan.some((operation) => operation.garageId !== input.garageId)) throw new Error("Cross-tenant import operation detected.");
  if (input.plan.some((operation) => operation.outcome === "CONFLICT")) throw new Error("Legacy import conflicts must be resolved before commit.");
  const outcomes = await input.repository.runInTransaction(input.plan);
  return { garageId: input.garageId, mode: "COMMIT", results: summarize(outcomes), databaseMutations: outcomes.filter((value) => value === "CREATED" || value === "UPDATED").length, storageMutations: 0 };
}

export function assertControlledImportOrder(phases: readonly string[]): void {
  let previous = -1;
  for (const phase of phases) {
    const index = CONTROLLED_IMPORT_PHASES.indexOf(phase as (typeof CONTROLLED_IMPORT_PHASES)[number]);
    if (index < 0 || index <= previous) throw new Error("Invalid controlled import dependency order.");
    previous = index;
  }
}
