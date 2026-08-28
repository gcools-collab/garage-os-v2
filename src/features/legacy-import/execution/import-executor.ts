import { buildControlledImportPlan, executeControlledImport, preflightControlledImport } from "../controlled-import";
import type { ControlledImportOperation, ControlledImportReport } from "../controlled-import";
import { assertExecutionContext } from "./safety";
import type { AtomicImportGateway, ExecutionReporter, ImportCheckpointRepository, ImportExecutionContext } from "./types";

const resultsAreIdempotent = (report: ControlledImportReport): boolean =>
  report.results.CREATED === 0 && report.results.UPDATED === 0 && report.results.CONFLICT === 0 && report.results.FAILED === 0;

export async function runControlledImport(input: {
  readonly context: ImportExecutionContext;
  readonly operations: readonly ControlledImportOperation[];
  readonly gateway: AtomicImportGateway;
  readonly checkpoints: ImportCheckpointRepository;
  readonly reporter: ExecutionReporter;
  readonly resetCompleted: boolean;
}): Promise<ControlledImportReport> {
  assertExecutionContext(input.context);
  if (input.operations.some((item) => item.garageId !== input.context.garageId)) throw new Error("CROSS_TENANT_IMPORT_OPERATION");
  const existing = await input.gateway.loadExisting(input.context.garageId);
  const plan = buildControlledImportPlan(input.operations, existing);
  const preflight = preflightControlledImport(input.context.garageId, plan);
  if (preflight.results.CONFLICT > 0 || preflight.results.UPDATED > 0) throw new Error("IMPORT_REQUIRES_REVIEW");
  input.reporter.report({ phase: "PREFLIGHT_OK", status: "COMPLETED", counts: preflight.results });
  if (input.context.mode === "DRY_RUN") return preflight;
  if (input.context.mode === "VERIFY_IDEMPOTENCE") {
    if (!resultsAreIdempotent(preflight)) throw new Error("IDEMPOTENCE_VERIFICATION_WOULD_MUTATE");
    return preflight;
  }
  const current = await input.checkpoints.get(input.context.garageId);
  if (current === null) await input.checkpoints.advance(input.context.garageId, null, "PREFLIGHT_OK");
  const report = await executeControlledImport({
    garageId: input.context.garageId,
    plan,
    repository: { runInTransaction: async (items) => (await input.gateway.executeAtomicBatch(input.context.garageId, items)).outcomes },
    confirmation: input.context.importConfirmation,
    resetCompletedBeforeCustomerImport: input.resetCompleted,
  });
  if (report.results.FAILED || report.results.CONFLICT) throw new Error("IMPORT_BATCH_FAILED");
  await input.checkpoints.advance(input.context.garageId, "RESET_STORAGE_DONE", "DATA_IMPORT_DONE");
  input.reporter.report({ phase: "DATA_IMPORT_DONE", status: "COMPLETED", counts: report.results });
  return report;
}
