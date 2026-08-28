import { assertApprovedResetPlan, executeControlledDatabaseReset, executeControlledStorageReset, planControlledReset } from "@/features/data-readiness";
import type { ControlledResetGateway } from "@/features/data-readiness";
import type { ControlledImportOperation } from "../controlled-import";
import { runControlledImport } from "./import-executor";
import { executeApprovedMediaImport } from "./media-executor";
import { assertExecutionContext, assertResetAuthorization } from "./safety";
import type {
  AtomicImportGateway, ExecutionReporter, ImportCheckpointRepository, ImportExecutionContext,
  MediaManifestEntry, MediaRelationGateway, MediaStorageGateway,
} from "./types";
import type { ApprovedResetExpectation } from "./types";

export async function executeB2Workflow(input: {
  readonly context: ImportExecutionContext;
  readonly resetGateway: ControlledResetGateway;
  readonly resetExpectation: ApprovedResetExpectation;
  readonly operations: readonly ControlledImportOperation[];
  readonly importGateway: AtomicImportGateway;
  readonly checkpoints: ImportCheckpointRepository;
  readonly reporter: ExecutionReporter;
  readonly media: Readonly<{ sourceRoot: string; manifest: Readonly<{ version: number; entries: readonly MediaManifestEntry[] }>; storage: MediaStorageGateway; relations: MediaRelationGateway }>;
}) {
  assertExecutionContext(input.context);
  const resetPlan = await planControlledReset(input.resetGateway, input.context.garageId);
  if (input.context.mode === "DRY_RUN" || input.context.mode === "VERIFY_IDEMPOTENCE") {
    const dataPlan = await runControlledImport({ ...input, gateway: input.importGateway, resetCompleted: true });
    return { resetPlan, dataPlan, media: null };
  }
  assertResetAuthorization(input.context);

  let current = await input.checkpoints.get(input.context.garageId);
  if (current === null) { assertApprovedResetPlan(resetPlan,input.resetExpectation); await input.checkpoints.advance(input.context.garageId,null,"PREFLIGHT_OK"); current="PREFLIGHT_OK"; }
  if (current === "PREFLIGHT_OK") {
    const fresh=await planControlledReset(input.resetGateway,input.context.garageId); assertApprovedResetPlan(fresh,input.resetExpectation);
    await executeControlledDatabaseReset(input.resetGateway,fresh,input.resetExpectation.databaseRows);
    await input.checkpoints.advance(input.context.garageId,"PREFLIGHT_OK","RESET_DB_DONE"); current="RESET_DB_DONE";
  }
  if (current === "RESET_DB_DONE") {
    const fresh=await planControlledReset(input.resetGateway,input.context.garageId);
    if(fresh.blockers.length)throw new Error(`RESET_BLOCKED:${fresh.blockers.join(",")}`);
    await executeControlledStorageReset(input.resetGateway,fresh,input.resetExpectation.storageObjects,input.resetExpectation.storageBytes);
    await input.checkpoints.advance(input.context.garageId,"RESET_DB_DONE","RESET_STORAGE_DONE"); current="RESET_STORAGE_DONE";
  }
  let committed=null;
  if(current==="RESET_STORAGE_DONE") { committed=await runControlledImport({ ...input, gateway: input.importGateway, resetCompleted: true }); current="DATA_IMPORT_DONE"; }
  if(current!=="DATA_IMPORT_DONE"&&current!=="MEDIA_UPLOAD_DONE"&&current!=="MEDIA_RELATIONS_DONE"&&current!=="IMPORT_VERIFIED")throw new Error(`UNSUPPORTED_RESUME_CHECKPOINT:${current}`);
  if(current==="IMPORT_VERIFIED") return {resetPlan,dataPlan:committed,media:null};
  const media = await executeApprovedMediaImport({
    garageId: input.context.garageId, authorizedGarageId: input.context.authorizedGarageId,
    sourceRoot: input.media.sourceRoot, manifest: input.media.manifest, storage: input.media.storage, relations: input.media.relations,
  });
  if (media.failures.length) throw new Error(`MEDIA_EXECUTION_FAILED:${media.failures[0]}`);
  if(current==="DATA_IMPORT_DONE"){await input.checkpoints.advance(input.context.garageId,"DATA_IMPORT_DONE","MEDIA_UPLOAD_DONE");current="MEDIA_UPLOAD_DONE";}
  if(current==="MEDIA_UPLOAD_DONE"){await input.checkpoints.advance(input.context.garageId,"MEDIA_UPLOAD_DONE","MEDIA_RELATIONS_DONE");current="MEDIA_RELATIONS_DONE";}
  await input.checkpoints.advance(input.context.garageId, "MEDIA_RELATIONS_DONE", "IMPORT_VERIFIED");
  return { resetPlan, dataPlan: committed, media };
}

export async function executeMediaResumeWorkflow(input: {
  readonly context: ImportExecutionContext;
  readonly checkpoints: ImportCheckpointRepository;
  readonly media: Readonly<{ sourceRoot: string; manifest: Readonly<{ version: number; entries: readonly MediaManifestEntry[] }>; storage: MediaStorageGateway; relations: MediaRelationGateway }>;
}) {
  if (input.context.mode !== "EXECUTE_MEDIA") throw new Error("MEDIA_RESUME_REQUIRES_EXECUTE_MEDIA_MODE");
  assertExecutionContext(input.context);
  let current = await input.checkpoints.get(input.context.garageId);
  if (current !== "DATA_IMPORT_DONE" && current !== "MEDIA_UPLOAD_DONE" && current !== "MEDIA_RELATIONS_DONE" && current !== "IMPORT_VERIFIED") {
    throw new Error(`MEDIA_RESUME_CHECKPOINT_INVALID:${current ?? "null"}`);
  }
  if (current === "IMPORT_VERIFIED") {
    return { media: null, checkpoint: current, resumed: false };
  }
  const media = await executeApprovedMediaImport({
    garageId: input.context.garageId,
    authorizedGarageId: input.context.authorizedGarageId,
    sourceRoot: input.media.sourceRoot,
    manifest: input.media.manifest,
    storage: input.media.storage,
    relations: input.media.relations,
  });
  if (media.failures.length) throw new Error(`MEDIA_EXECUTION_FAILED:${media.failures[0]}`);
  if (current === "DATA_IMPORT_DONE") {
    await input.checkpoints.advance(input.context.garageId, "DATA_IMPORT_DONE", "MEDIA_UPLOAD_DONE");
    current = "MEDIA_UPLOAD_DONE";
  }
  if (current === "MEDIA_UPLOAD_DONE") {
    await input.checkpoints.advance(input.context.garageId, "MEDIA_UPLOAD_DONE", "MEDIA_RELATIONS_DONE");
    current = "MEDIA_RELATIONS_DONE";
  }
  await input.checkpoints.advance(input.context.garageId, "MEDIA_RELATIONS_DONE", "IMPORT_VERIFIED");
  return { media, checkpoint: "IMPORT_VERIFIED" as const, resumed: true };
}
