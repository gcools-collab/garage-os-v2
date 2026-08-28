import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildLegacyMediaReconciliation, indexPhysicalMedia, parseWordPressWxr, serializeLegacyMediaManifest } from "../src/features/legacy-import";

const garageId = "363f2dc0-bfd3-48d6-a1cc-96e113e96094";
const wxrPath = resolve(".local/legacy/serviceautoauxparticuliers.WordPress.2026-08-14.xml");
const configuredMediaRoot = process.argv[2] ?? process.env.WORDPRESS_UPLOADS_ROOT;
if (!configuredMediaRoot) throw new Error("WORDPRESS_UPLOADS_ROOT is required.");
const mediaRoot = resolve(configuredMediaRoot);
const manifestPath = resolve(".local/legacy/go-0084b1-final-media-manifest.json");
const excludedVehicleIds = new Set(["4915", "4927", "6054"]);
const vehicles = parseWordPressWxr(readFileSync(wxrPath, "utf8"), garageId).map((vehicle) =>
  excludedVehicleIds.has(vehicle.externalId) ? { ...vehicle, decision: "IGNORE" as const } : vehicle
);
const report = buildLegacyMediaReconciliation({ garageId, vehicles, files: indexPhysicalMedia(mediaRoot) });
const serialized = serializeLegacyMediaManifest(report);
const verification = serializeLegacyMediaManifest(buildLegacyMediaReconciliation({ garageId, vehicles, files: indexPhysicalMedia(mediaRoot) }));
if (serialized !== verification) throw new Error("LEGACY_MEDIA_MANIFEST_NON_DETERMINISTIC");
writeFileSync(manifestPath, serialized, "utf8");

process.stdout.write(`${JSON.stringify({
  sources: { wxrPath, mediaRoot, manifestPath },
  vehicles: { detected: vehicles.length, importable: vehicles.filter((v) => v.decision === "IMPORT").length, ignored: vehicles.filter((v) => v.decision === "IGNORE").length, review: vehicles.filter((v) => v.decision === "REVIEW").length },
  counters: report.counters,
  resolutions: report.entries.reduce<Record<string, number>>((counts, entry) => ({ ...counts, [entry.resolution]: (counts[entry.resolution] ?? 0) + 1 }), {}),
  coverage: report.coverage,
  duplicateHashes: Object.entries(report.entries.reduce<Record<string, number>>((counts, entry) => entry.sha256 ? ({ ...counts, [entry.sha256]: (counts[entry.sha256] ?? 0) + 1 }) : counts, {})).filter(([, count]) => count > 1).map(([hash, count]) => ({ hash: hash.slice(0, 12), count })),
  databaseMutations: report.databaseMutations, storageMutations: report.storageMutations,
}, null, 2)}\n`);
