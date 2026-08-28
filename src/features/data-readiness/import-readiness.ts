import { createHash } from "node:crypto";
import { z } from "zod";
import type { ImportCandidate, ImportIdentity, ImportOutcome } from "./types";

const MAX_PAYLOAD_BYTES = 256_000;
export const importIdentitySchema = z.object({
  garageId: z.uuid(), source: z.enum(["WORDPRESS", "WOOCOMMERCE", "YITH", "ELEMENTOR"]), externalId: z.string().trim().min(1).max(200),
});

export function createImportCandidate<T>(identity: ImportIdentity, payload: T): ImportCandidate<T> {
  const parsed = importIdentitySchema.parse(identity);
  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES) throw new Error("Import payload exceeds the allowed size.");
  return { ...parsed, payload, fingerprint: createHash("sha256").update(serialized).digest("hex") };
}

export function classifyImportCandidate<T>(candidate: ImportCandidate<T>, existing: readonly Pick<ImportCandidate<unknown>, "garageId" | "source" | "externalId" | "fingerprint">[]): ImportOutcome {
  const sameExternal = existing.find((item) => item.source === candidate.source && item.externalId === candidate.externalId);
  if (!sameExternal) return "CREATED";
  if (sameExternal.garageId !== candidate.garageId) return "CONFLICT";
  return sameExternal.fingerprint === candidate.fingerprint ? "SKIPPED" : "UPDATED";
}
