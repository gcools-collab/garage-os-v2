import { createHash } from "node:crypto"
import type { ValidatedPublicLeadInput } from "../types"

export type LeadSubmissionGuardResult =
  | { readonly allowed: true; readonly fingerprint: string }
  | { readonly allowed: false; readonly reason: "honeypot" | "too_fast" }

export function guardLeadSubmission(
  input: ValidatedPublicLeadInput,
  now = Date.now()
): LeadSubmissionGuardResult {
  if (input.website.trim()) return { allowed: false, reason: "honeypot" }
  if (now - input.formStartedAt < 2_000) return { allowed: false, reason: "too_fast" }
  const fingerprint = createHash("sha256").update([
    input.garageSlug,
    input.vehicleSlug,
    input.type,
    input.customerEmail ?? "",
    input.customerPhone ?? "",
  ].join("|")).digest("hex")
  return { allowed: true, fingerprint }
}

export function buildPublicLeadReference(id: string) {
  return `GO-${id.replace(/-/g, "").slice(0, 5).toUpperCase()}`
}
