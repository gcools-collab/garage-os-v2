import type { ImportCheckpoint } from "./types";

export const IMPORT_CHECKPOINT_SEQUENCE = [
  "PREFLIGHT_OK",
  "RESET_DB_DONE",
  "RESET_STORAGE_DONE",
  "DATA_IMPORT_DONE",
  "MEDIA_UPLOAD_DONE",
  "MEDIA_RELATIONS_DONE",
  "IMPORT_VERIFIED",
] as const satisfies readonly ImportCheckpoint[];

export function assertCheckpointTransition(current: ImportCheckpoint | null, next: ImportCheckpoint): void {
  const expectedIndex = current === null ? 0 : IMPORT_CHECKPOINT_SEQUENCE.indexOf(current) + 1;
  if (IMPORT_CHECKPOINT_SEQUENCE[expectedIndex] !== next) throw new Error("CHECKPOINT_TRANSITION_INVALID");
}
