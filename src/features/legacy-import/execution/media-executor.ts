import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import type { MediaExecutionResult, MediaManifestEntry, MediaRelationGateway, MediaStorageGateway } from "./types";
import { assertTenantStoragePath } from "./storage-path";

type ApprovedManifest = Readonly<{ version: number; entries: readonly MediaManifestEntry[] }>;
const hash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const portable = (value: string): string => value.split(sep).join("/");

const contentType = (path: string): string => ({
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
}[extname(path).toLowerCase()] ?? "application/octet-stream");

export function loadApprovedMediaManifest(path: string, approvedSha256: string): ApprovedManifest {
  const bytes = readFileSync(path);
  if (hash(bytes) !== approvedSha256) throw new Error("MEDIA_MANIFEST_HASH_MISMATCH");
  const parsed: unknown = JSON.parse(bytes.toString("utf8"));
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { entries?: unknown }).entries)) throw new Error("MEDIA_MANIFEST_INVALID");
  return parsed as ApprovedManifest;
}

export async function executeApprovedMediaImport(input: {
  readonly garageId: string;
  readonly authorizedGarageId: string;
  readonly sourceRoot: string;
  readonly manifest: ApprovedManifest;
  readonly storage: MediaStorageGateway;
  readonly relations: MediaRelationGateway;
  readonly bucket?: string;
}): Promise<MediaExecutionResult> {
  if (input.garageId !== input.authorizedGarageId) throw new Error("MEDIA_AUTHORIZED_TENANT_MISMATCH");
  const bucket = input.bucket ?? "vehicle-images";
  const sourceRoot = resolve(input.sourceRoot);
  const vehicleIds = new Map<string, string>();
  for (const entry of input.manifest.entries) {
    if (entry.garage_id !== input.garageId) throw new Error("MEDIA_MANIFEST_CROSS_TENANT_ENTRY");
    if (entry.attachment_id === "57303" || ["4915", "4927", "6054"].includes(entry.vehicle_legacy_external_id)) throw new Error("MEDIA_MANIFEST_EXCLUDED_ENTRY");
    if (entry.status !== "AUTO" || !entry.source_relative_path || !entry.source_size || !entry.sha256 || !entry.target_storage_path) throw new Error(`MEDIA_MANIFEST_UNRESOLVED:${entry.attachment_id}`);
    if (!vehicleIds.has(entry.vehicle_legacy_external_id)) {
      const vehicleId = await input.relations.resolveVehicleId(input.garageId, entry.vehicle_legacy_external_id);
      if (!vehicleId) throw new Error(`MEDIA_VEHICLE_NOT_FOUND:${entry.vehicle_legacy_external_id}`);
      vehicleIds.set(entry.vehicle_legacy_external_id, vehicleId);
    }
  }

  let uploaded = 0;
  let reused = 0;
  let relationsCreated = 0;
  let vehicleImagesCreated = 0;
  const failures: string[] = [];
  const physicalKeys = new Set<string>();

  for (const entry of input.manifest.entries) {
    const vehicleId = vehicleIds.get(entry.vehicle_legacy_external_id)!;
    const relative = portable(entry.source_relative_path!);
    if (relative.includes("../") || relative.startsWith("/")) throw new Error("MEDIA_SOURCE_PATH_INVALID");
    const sourcePath = resolve(sourceRoot, ...relative.split("/"));
    if (!sourcePath.startsWith(`${sourceRoot}${sep}`)) throw new Error("MEDIA_SOURCE_PATH_ESCAPE");
    const bytes = readFileSync(sourcePath);
    if (bytes.byteLength !== entry.source_size) throw new Error(`MEDIA_SOURCE_SIZE_MISMATCH:${entry.attachment_id}`);
    if (hash(bytes) !== entry.sha256) throw new Error(`MEDIA_SOURCE_HASH_MISMATCH:${entry.attachment_id}`);
    const target = entry.target_storage_path!.replace("{vehicle_id}", vehicleId);
    assertTenantStoragePath(target, input.garageId, vehicleId);
    const physicalKey = `${entry.vehicle_legacy_external_id}|${entry.sha256}`;
    const createVehicleImage = !physicalKeys.has(physicalKey);
    if (createVehicleImage) {
      const existing = await input.storage.inspect(bucket, target);
      if (existing.exists) {
        if (existing.size !== bytes.byteLength || (existing.sha256 && existing.sha256 !== entry.sha256)) throw new Error(`MEDIA_TARGET_CONFLICT:${entry.attachment_id}`);
        reused += 1;
      } else {
        try { await input.storage.upload(bucket, target, bytes, contentType(sourcePath)); uploaded += 1; }
        catch { failures.push(`UPLOAD_FAILED:${entry.attachment_id}`); break; }
      }
      physicalKeys.add(physicalKey);
    }
    try {
      const outcome = await input.relations.persist(entry, vehicleId, target, createVehicleImage);
      if (outcome === "CREATED") {
        relationsCreated += 1;
        if (createVehicleImage) vehicleImagesCreated += 1;
      } else if (outcome === "CONFLICT" || outcome === "FAILED") {
        failures.push(`RELATION_${outcome}:${entry.attachment_id}`);
        break;
      }
    } catch {
      failures.push(`RELATION_FAILED_AFTER_UPLOAD:${entry.attachment_id}:${target}`);
      break;
    }
  }
  return { uploaded, reused, relationsCreated, vehicleImagesCreated, failures };
}
