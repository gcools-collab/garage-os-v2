import { createPublicSupabaseClient } from "@/features/live-stock"
import type { ValidatedPublicLeadInput } from "../types"

export type PublicLeadPersistenceOutcome =
  | { readonly outcome: "success"; readonly leadId: string }
  | {
    readonly outcome:
      | "unavailable_vehicle" | "unavailable_garage" | "rate_limited"
      | "duplicate_submission" | "persistence_error"
  }

export async function createPublicLead({
  input,
  fingerprint,
}: {
  readonly input: ValidatedPublicLeadInput
  readonly fingerprint: string
}): Promise<PublicLeadPersistenceOutcome> {
  const { data, error } = await createPublicSupabaseClient().rpc(
    "create_public_vehicle_lead",
    {
      p_garage_slug: input.garageSlug,
      p_vehicle_slug: input.vehicleSlug,
      p_type: input.type,
      p_customer_name: input.customerName,
      p_customer_phone: input.customerPhone,
      p_customer_email: input.customerEmail,
      p_preferred_date: input.preferredDate,
      p_preferred_time: input.preferredTime,
      p_message: input.message,
      p_public_page_url: input.publicPageUrl,
      p_consent_contact: input.consentContact,
      p_consent_marketing: input.consentMarketing,
      p_submission_fingerprint: fingerprint,
    }
  )
  if (error) {
    console.error("Public lead persistence failed", {
      operation: "create_public_vehicle_lead",
      code: error.code,
    })
    return { outcome: "persistence_error" }
  }
  const row = Array.isArray(data) ? data[0] : null
  if (!row || typeof row.outcome !== "string") return { outcome: "persistence_error" }
  if (row.outcome === "success" && typeof row.lead_id === "string") {
    return { outcome: "success", leadId: row.lead_id }
  }
  if ([
    "unavailable_vehicle", "unavailable_garage", "rate_limited", "duplicate_submission",
  ].includes(row.outcome)) {
    return { outcome: row.outcome as Exclude<PublicLeadPersistenceOutcome["outcome"], "success" | "persistence_error"> }
  }
  return { outcome: "persistence_error" }
}
