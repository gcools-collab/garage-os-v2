import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import type { LegacyVehicle } from "./types";

export type MediaResolutionStatus = "AUTO" | "REVIEW" | "BLOCKER";
export type PhysicalMediaFile = Readonly<{ absolutePath: string; relativePath: string; size: number; generatedVariant: boolean }>;
export type LegacyMediaManifestEntry = Readonly<{
  garage_id: string; vehicle_legacy_external_id: string; vehicle_title: string; attachment_id: string;
  source_relative_path: string | null; source_size: number | null; sha256: string | null;
  gallery_position: number; is_primary: boolean; legacy_url: string | null; legacy_attached_file: string | null;
  target_storage_path: string | null; status: MediaResolutionStatus;
  resolution: "EXACT" | "DUPLICATED_YEAR" | "UNIQUE_SUFFIX" | "MISSING" | "AMBIGUOUS";
}>;
export type VehicleMediaCoverage = Readonly<{
  vehicleTitle: string; legacyId: string; galleryRelations: number; primary: MediaResolutionStatus;
  physicalFound: number; missing: number; ambiguous: number; status: MediaResolutionStatus;
}>;
export type MediaReconciliation = Readonly<{
  entries: readonly LegacyMediaManifestEntry[]; coverage: readonly VehicleMediaCoverage[];
  counters: Readonly<{
    vehicles: number; mediaRelations: number; attachmentsExpected: number; physicalFilesFound: number;
    uniquePhysicalFiles: number; missing: number; ambiguous: number; primaryResolved: number;
    vehiclesWithZeroPhysicalMedia: number; duplicateAttachmentRelations: number; duplicateSha256: number;
    wordpressGeneratedVariantsIgnored: number; selectedPhysicalBytes: number;
  }>;
  databaseMutations: 0; storageMutations: 0;
}>;

const portable = (value: string): string => value.split(sep).join("/").replace(/^\.\//, "");
const generatedVariantPattern = /(?:-\d+x\d+|-scaled|-rotated)(?=\.[^.]+$)|\.(?:webp|avif)$/i;

export function isWordPressGeneratedVariant(path: string): boolean {
  return generatedVariantPattern.test(basename(path));
}

export function indexPhysicalMedia(root: string): readonly PhysicalMediaFile[] {
  const files: PhysicalMediaFile[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) {
        const relativePath = portable(relative(root, path));
        files.push({ absolutePath: path, relativePath, size: statSync(path).size, generatedVariant: isWordPressGeneratedVariant(relativePath) });
      }
    }
  };
  visit(root);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));
}

const sha256 = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
const expectedPaths = (attachedFile: string): readonly string[] => {
  const normalized = portable(attachedFile).replace(/^\/+/, "");
  const year = normalized.match(/^(\d{4})\//)?.[1];
  return year ? [normalized, `${year}/${normalized}`] : [normalized];
};
type Resolution = Readonly<{ file: PhysicalMediaFile | null; kind: LegacyMediaManifestEntry["resolution"]; status: MediaResolutionStatus }>;

export function resolvePhysicalOriginal(attachedFile: string | null, files: readonly PhysicalMediaFile[]): Resolution {
  if (!attachedFile) return { file: null, kind: "MISSING", status: "BLOCKER" };
  const candidates = files.filter((file) => !file.generatedVariant);
  const [exact, duplicated] = expectedPaths(attachedFile);
  const exactMatch = candidates.find((file) => file.relativePath.toLocaleLowerCase("en") === exact.toLocaleLowerCase("en"));
  if (exactMatch) return { file: exactMatch, kind: "EXACT", status: "AUTO" };
  if (duplicated) {
    const duplicatedMatch = candidates.find((file) => file.relativePath.toLocaleLowerCase("en") === duplicated.toLocaleLowerCase("en"));
    if (duplicatedMatch) return { file: duplicatedMatch, kind: "DUPLICATED_YEAR", status: "AUTO" };
  }
  const suffix = `/${portable(attachedFile).replace(/^\/+/, "")}`;
  const normalizedSuffix = suffix.toLocaleLowerCase("en");
  const suffixMatches = candidates.filter((file) => `/${file.relativePath}`.toLocaleLowerCase("en").endsWith(normalizedSuffix));
  if (suffixMatches.length === 1) return { file: suffixMatches[0], kind: "UNIQUE_SUFFIX", status: "AUTO" };
  if (suffixMatches.length > 1) return { file: null, kind: "AMBIGUOUS", status: "REVIEW" };
  return { file: null, kind: "MISSING", status: "BLOCKER" };
}

const targetPath = (garageId: string, vehicleExternalId: string, digest: string, sourcePath: string): string => {
  const extension = extname(sourcePath).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  return `${garageId}/{vehicle_id}/legacy-${vehicleExternalId}-${digest.slice(0, 12)}${extension}`;
};
const worst = (values: readonly MediaResolutionStatus[]): MediaResolutionStatus =>
  values.includes("BLOCKER") ? "BLOCKER" : values.includes("REVIEW") ? "REVIEW" : "AUTO";

export function buildLegacyMediaReconciliation(input: { readonly garageId: string; readonly vehicles: readonly LegacyVehicle[]; readonly files: readonly PhysicalMediaFile[] }): MediaReconciliation {
  const importable = input.vehicles.filter((vehicle) => vehicle.decision === "IMPORT");
  const hashCache = new Map<string, string>();
  const entries = importable.flatMap((vehicle) => vehicle.media.map((media): LegacyMediaManifestEntry => {
    const resolution = resolvePhysicalOriginal(media.originalRelativePath ?? media.relativePath, input.files);
    const digest = resolution.file ? (hashCache.get(resolution.file.absolutePath) ?? sha256(resolution.file.absolutePath)) : null;
    if (resolution.file && digest) hashCache.set(resolution.file.absolutePath, digest);
    return {
      garage_id: input.garageId, vehicle_legacy_external_id: vehicle.externalId, vehicle_title: vehicle.title,
      attachment_id: media.attachmentId, source_relative_path: resolution.file?.relativePath ?? null,
      source_size: resolution.file?.size ?? null, sha256: digest, gallery_position: media.position,
      is_primary: media.role === "COVER", legacy_url: media.legacyUrl, legacy_attached_file: media.relativePath,
      target_storage_path: resolution.file && digest ? targetPath(input.garageId, vehicle.externalId, digest, resolution.file.relativePath) : null,
      status: resolution.status, resolution: resolution.kind,
    };
  }));
  const coverage = importable.map((vehicle): VehicleMediaCoverage => {
    const vehicleEntries = entries.filter((entry) => entry.vehicle_legacy_external_id === vehicle.externalId);
    const primary = vehicleEntries.find((entry) => entry.is_primary);
    return {
      vehicleTitle: vehicle.title, legacyId: vehicle.externalId, galleryRelations: vehicleEntries.length,
      primary: primary?.status ?? "BLOCKER", physicalFound: vehicleEntries.filter((entry) => entry.status === "AUTO").length,
      missing: vehicleEntries.filter((entry) => entry.resolution === "MISSING").length,
      ambiguous: vehicleEntries.filter((entry) => entry.resolution === "AMBIGUOUS").length,
      status: vehicleEntries.length === 0 ? "BLOCKER" : worst(vehicleEntries.map((entry) => entry.status)),
    };
  });
  const attachmentCounts = new Map<string, number>();
  for (const entry of entries) attachmentCounts.set(entry.attachment_id, (attachmentCounts.get(entry.attachment_id) ?? 0) + 1);
  const hashes = entries.flatMap((entry) => entry.sha256 ? [entry.sha256] : []);
  const uniquePaths = new Set(entries.flatMap((entry) => entry.source_relative_path ? [entry.source_relative_path] : []));
  return {
    entries, coverage,
    counters: {
      vehicles: importable.length, mediaRelations: entries.length, attachmentsExpected: new Set(entries.map((entry) => entry.attachment_id)).size,
      physicalFilesFound: entries.filter((entry) => entry.status === "AUTO").length, uniquePhysicalFiles: uniquePaths.size,
      missing: entries.filter((entry) => entry.resolution === "MISSING").length,
      ambiguous: entries.filter((entry) => entry.resolution === "AMBIGUOUS").length,
      primaryResolved: coverage.filter((item) => item.primary === "AUTO").length,
      vehiclesWithZeroPhysicalMedia: coverage.filter((item) => item.physicalFound === 0).length,
      duplicateAttachmentRelations: [...attachmentCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0),
      duplicateSha256: [...new Set(hashes)].reduce((sum, hash) => {
        const distinctPaths = new Set(entries.filter((entry) => entry.sha256 === hash).map((entry) => entry.source_relative_path));
        return sum + Math.max(0, distinctPaths.size - 1);
      }, 0),
      wordpressGeneratedVariantsIgnored: input.files.filter((file) => file.generatedVariant).length,
      selectedPhysicalBytes: [...uniquePaths].reduce((sum, path) => sum + (input.files.find((file) => file.relativePath === path)?.size ?? 0), 0),
    },
    databaseMutations: 0, storageMutations: 0,
  };
}

export function serializeLegacyMediaManifest(report: MediaReconciliation): string {
  const entries = [...report.entries].sort((left, right) =>
    left.vehicle_legacy_external_id.localeCompare(right.vehicle_legacy_external_id, "en", { numeric: true }) ||
    left.gallery_position - right.gallery_position || left.attachment_id.localeCompare(right.attachment_id, "en", { numeric: true })
  );
  return `${JSON.stringify({ version: 1, sourceRoot: "WORDPRESS_UPLOADS_ROOT", entries }, null, 2)}\n`;
}
