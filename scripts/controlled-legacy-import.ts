import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { planControlledReset, SupabaseControlledResetGateway } from "../src/features/data-readiness";
import {
  bundleBreakdown,
  executeB2Workflow, executeMediaResumeWorkflow, loadApprovedMediaManifest, SAP_APPROVED_GARAGE_ID, SAP_APPROVED_IMPORT_COUNTS,
  parseExecutionBundle,
  runControlledImport,
  SAP_APPROVED_MANIFEST_SHA256, SAP_APPROVED_RESET, StructuredExecutionReporter,
  SupabaseControlledImportRepository, SupabaseImportCheckpointRepository,
  SupabaseMediaRelationGateway, SupabaseMediaStorageGateway,
} from "../src/features/legacy-import";
import type { ControlledImportOperation, LegacyImportSupabaseClient } from "../src/features/legacy-import";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {

const args = new Set(process.argv.slice(2));
const help = (): never => {
  process.stderr.write("Usage: npm run legacy-import -- --dry-run|--execute-data|--execute-media|--execute\nExecution is disabled unless an execute mode plus separate import/reset environment confirmations are supplied.\n");
  process.exit(2);
};
if (!["--dry-run", "--execute-data", "--execute-media", "--execute"].some((arg) => args.has(arg))) help();
if (["--dry-run", "--execute-data", "--execute-media", "--execute"].filter((arg) => args.has(arg)).length !== 1) help();

const manifestPath = resolve(".local/legacy/go-0084b1-final-media-manifest.json");
const manifest = loadApprovedMediaManifest(manifestPath, SAP_APPROVED_MANIFEST_SHA256);
const physical = new Set(manifest.entries.map((entry) => `${entry.vehicle_legacy_external_id}|${entry.sha256}`));
if (manifest.entries.length !== SAP_APPROVED_IMPORT_COUNTS.mediaRelations || physical.size !== SAP_APPROVED_IMPORT_COUNTS.mediaUploads) throw new Error("APPROVED_MEDIA_CARDINALITY_DRIFT");

const bundlePath = process.env.GARAGE_OS_LEGACY_IMPORT_BUNDLE;
const bundleHash = process.env.GARAGE_OS_LEGACY_IMPORT_BUNDLE_SHA256;
if (!bundlePath || !bundleHash) throw new Error("REVIEWED_OPERATION_BUNDLE_REQUIRED");
const bundle = parseExecutionBundle(readFileSync(resolve(bundlePath)), SAP_APPROVED_GARAGE_ID, bundleHash);
const counts = bundleBreakdown(bundle);
if (counts.CUSTOMER!==84||counts.CUSTOMER_VEHICLE!==0||counts.VEHICLE!==18||counts.APPOINTMENT!==495||counts.HISTORICAL_PAYMENT!==55||counts.LEAD!==121) throw new Error("OPERATION_BUNDLE_CARDINALITY_MISMATCH");
const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY;
if(!url||!key) throw new Error("LEGACY_IMPORT_ADMIN_CONFIG_MISSING");
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}) as unknown as LegacyImportSupabaseClient;
const checkpoints=new SupabaseImportCheckpointRepository(client,"GO-0084B2-SAP-v1");

if (args.has("--execute") || args.has("--execute-data") || args.has("--execute-media")) {
  if (process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT !== "true") throw new Error("LEGACY_IMPORT_OPT_IN_MISSING");
  if (process.env.GARAGE_OS_LEGACY_IMPORT_CONFIRMATION !== `IMPORT:${SAP_APPROVED_GARAGE_ID}`) throw new Error("LEGACY_IMPORT_CONFIRMATION_INVALID");
  const importRepository=new SupabaseControlledImportRepository(client);
  if (args.has("--execute-data")) {
    if (process.env.GARAGE_OS_TENANT_RESET_CONFIRMATION !== `RESET:${SAP_APPROVED_GARAGE_ID}`) throw new Error("TENANT_RESET_CONFIRMATION_INVALID");
    const checkpoint=await checkpoints.get(SAP_APPROVED_GARAGE_ID);
    if(checkpoint!=="RESET_STORAGE_DONE") throw new Error(`DATA_IMPORT_RESUME_CHECKPOINT_INVALID:${checkpoint}`);
    const result=await runControlledImport({
      context:{garageId:SAP_APPROVED_GARAGE_ID,authorizedGarageId:SAP_APPROVED_GARAGE_ID,mode:"EXECUTE",importConfirmation:process.env.GARAGE_OS_LEGACY_IMPORT_CONFIRMATION,resetConfirmation:process.env.GARAGE_OS_TENANT_RESET_CONFIRMATION},
      operations:bundle.operations as readonly ControlledImportOperation[],gateway:importRepository,checkpoints,
      reporter:new StructuredExecutionReporter(),resetCompleted:true,
    });
    process.stdout.write(`${JSON.stringify({mode:"EXECUTE_DATA",checkpointBefore:checkpoint,result},null,2)}\n`);
    process.exit(0);
  }
  if (args.has("--execute-media")) {
    const checkpoint=await checkpoints.get(SAP_APPROVED_GARAGE_ID);
    const result=await executeMediaResumeWorkflow({
      context:{garageId:SAP_APPROVED_GARAGE_ID,authorizedGarageId:SAP_APPROVED_GARAGE_ID,mode:"EXECUTE_MEDIA",importConfirmation:process.env.GARAGE_OS_LEGACY_IMPORT_CONFIRMATION},
      checkpoints,
      media:{sourceRoot:"C:\\Users\\AG-F4\\Desktop\\Extract new\\wp-content\\uploads",manifest,storage:new SupabaseMediaStorageGateway(url,key),relations:new SupabaseMediaRelationGateway(client)},
    });
    process.stdout.write(`${JSON.stringify({mode:"EXECUTE_MEDIA",checkpointBefore:checkpoint,result},null,2)}\n`);
    process.exit(0);
  }
  if (process.env.GARAGE_OS_TENANT_RESET_CONFIRMATION !== `RESET:${SAP_APPROVED_GARAGE_ID}`) throw new Error("TENANT_RESET_CONFIRMATION_INVALID");
  const result=await executeB2Workflow({
    context:{garageId:SAP_APPROVED_GARAGE_ID,authorizedGarageId:SAP_APPROVED_GARAGE_ID,mode:"EXECUTE",importConfirmation:process.env.GARAGE_OS_LEGACY_IMPORT_CONFIRMATION,resetConfirmation:process.env.GARAGE_OS_TENANT_RESET_CONFIRMATION},
    resetGateway:SupabaseControlledResetGateway.fromEnvironment(),resetExpectation:SAP_APPROVED_RESET,
    operations:bundle.operations as readonly ControlledImportOperation[],importGateway:importRepository,
    checkpoints,reporter:new StructuredExecutionReporter(),
    media:{sourceRoot:"C:\\Users\\AG-F4\\Desktop\\Extract new\\wp-content\\uploads",manifest,storage:new SupabaseMediaStorageGateway(url,key),relations:new SupabaseMediaRelationGateway(client)},
  });
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
  process.exit(0);
}

const gateway = SupabaseControlledResetGateway.fromEnvironment();
const reset = await planControlledReset(gateway, SAP_APPROVED_GARAGE_ID);
const checkpoint = await checkpoints.get(SAP_APPROVED_GARAGE_ID);
const resetAlreadyCompleted = checkpoint === "RESET_STORAGE_DONE" || checkpoint === "DATA_IMPORT_DONE" || checkpoint === "MEDIA_UPLOAD_DONE" || checkpoint === "MEDIA_RELATIONS_DONE" || checkpoint === "IMPORT_VERIFIED";
const structuredImportAlreadyCompleted = checkpoint === "DATA_IMPORT_DONE" || checkpoint === "MEDIA_UPLOAD_DONE" || checkpoint === "MEDIA_RELATIONS_DONE" || checkpoint === "IMPORT_VERIFIED";
process.stdout.write(`${JSON.stringify({ mode: "DRY_RUN", garageId: SAP_APPROVED_GARAGE_ID, checkpoint, resume: { resetAlreadyCompleted, resetWillRun: !resetAlreadyCompleted, structuredImportAlreadyCompleted, structuredImportWillRun: !structuredImportAlreadyCompleted && checkpoint === "RESET_STORAGE_DONE", nextStage: checkpoint === "RESET_STORAGE_DONE" ? "DATA_IMPORT" : checkpoint === "DATA_IMPORT_DONE" ? "MEDIA_UPLOAD" : checkpoint === "MEDIA_UPLOAD_DONE" ? "MEDIA_RELATIONS" : checkpoint === "MEDIA_RELATIONS_DONE" ? "IMPORT_VERIFICATION" : checkpoint === "IMPORT_VERIFIED" ? "COMPLETE" : "PREFLIGHT" }, approvedReset: SAP_APPROVED_RESET, observedReset: { databaseRows: reset.databaseRows, storageObjects: reset.storageObjects, storageBytes: reset.storageBytes, blockers: reset.blockers }, approvedImport: SAP_APPROVED_IMPORT_COUNTS, bundle: { operations: bundle.operations.length, counts }, media: { relations: manifest.entries.length, physical: physical.size, manifestSha256: SAP_APPROVED_MANIFEST_SHA256 }, mutations: { database: 0, storage: 0 } }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "LEGACY_IMPORT_CLI_FAILED"}\n`);
  process.exitCode = 1;
});
