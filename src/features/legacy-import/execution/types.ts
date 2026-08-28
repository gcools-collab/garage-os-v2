import type { ImportOutcome } from "@/features/data-readiness";
import type { PlannedImportOperation } from "../controlled-import";

export const IMPORT_CHECKPOINTS = [
  "PREFLIGHT_OK", "RESET_DB_DONE", "RESET_STORAGE_DONE", "DATA_IMPORT_DONE",
  "MEDIA_UPLOAD_DONE", "MEDIA_RELATIONS_DONE", "IMPORT_VERIFIED",
] as const;

export type ImportCheckpoint = (typeof IMPORT_CHECKPOINTS)[number];
export type ImportExecutionMode = "DRY_RUN" | "EXECUTE" | "EXECUTE_MEDIA" | "VERIFY_IDEMPOTENCE";

export type ApprovedResetExpectation = Readonly<{
  databaseRows: number;
  storageObjects: number;
  storageBytes: number;
}>;

export type ImportExecutionContext = Readonly<{
  garageId: string;
  authorizedGarageId: string;
  mode: ImportExecutionMode;
  importConfirmation?: string;
  resetConfirmation?: string;
}>;

export type ExecutionEvent = Readonly<{
  phase: ImportCheckpoint | "FAILED";
  entityType?: string;
  legacyExternalId?: string;
  status: "STARTED" | "COMPLETED" | "SKIPPED" | "FAILED";
  reason?: string;
  durationMs?: number;
  counts?: Readonly<Record<string, number>>;
}>;

export interface ExecutionReporter {
  report(event: ExecutionEvent): void;
}

export interface ImportCheckpointRepository {
  get(garageId: string): Promise<ImportCheckpoint | null>;
  advance(garageId: string, expectedCurrent: ImportCheckpoint | null, next: ImportCheckpoint): Promise<void>;
}

export type ImportBatchResult = Readonly<{
  outcomes: readonly ImportOutcome[];
  targetIds: readonly (string | null)[];
}>;

export interface AtomicImportGateway {
  loadExisting(garageId: string): Promise<readonly Readonly<{
    garageId: string;
    source: PlannedImportOperation["source"];
    externalId: string;
    fingerprint: string;
    entity: PlannedImportOperation["entity"];
  }>[]>;
  executeAtomicBatch(garageId: string, operations: readonly PlannedImportOperation[]): Promise<ImportBatchResult>;
}

export type MediaManifestEntry = Readonly<{
  garage_id: string;
  vehicle_legacy_external_id: string;
  attachment_id: string;
  source_relative_path: string | null;
  source_size: number | null;
  sha256: string | null;
  gallery_position: number;
  is_primary: boolean;
  target_storage_path: string | null;
  status: "AUTO" | "REVIEW" | "BLOCKER";
}>;

export interface MediaStorageGateway {
  inspect(bucket: string, path: string): Promise<Readonly<{ exists: boolean; size: number | null; sha256: string | null }>>;
  upload(bucket: string, path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  deleteOwned(bucket: string, path: string): Promise<void>;
}

export interface MediaRelationGateway {
  resolveVehicleId(garageId: string, legacyVehicleId: string): Promise<string | null>;
  persist(entry: MediaManifestEntry, vehicleId: string, storagePath: string, createVehicleImage: boolean): Promise<ImportOutcome>;
}

export type MediaExecutionResult = Readonly<{
  uploaded: number;
  reused: number;
  relationsCreated: number;
  vehicleImagesCreated: number;
  failures: readonly string[];
}>;
