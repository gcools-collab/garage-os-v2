import { createPublicSupabaseClient } from "@/features/live-stock/data/public-supabase-client"
import type { PublicRequestSource, PublicRequestType } from "../types"

export async function createPublicCustomerRequest(input: {
  readonly garageSlug: string; readonly vehicleSlug: string | null; readonly requestType: PublicRequestType; readonly source: PublicRequestSource
  readonly customerName: string; readonly phone: string | null; readonly email: string | null; readonly preferredDate: string | null
  readonly preferredTime: string | null; readonly message: string | null; readonly payload: Readonly<Record<string, unknown>>
  readonly publicPageUrl: string; readonly consentContact: boolean; readonly consentMarketing: boolean; readonly fingerprint: string
}) {
  const { data, error } = await createPublicSupabaseClient().rpc("create_public_customer_request", {
    p_garage_slug: input.garageSlug, p_vehicle_slug: input.vehicleSlug, p_request_type: input.requestType,
    p_source: input.source, p_customer_name: input.customerName, p_customer_phone: input.phone,
    p_customer_email: input.email, p_preferred_date: input.preferredDate, p_preferred_time: input.preferredTime,
    p_message: input.message, p_payload: input.payload, p_public_page_url: input.publicPageUrl,
    p_consent_contact: input.consentContact, p_consent_marketing: input.consentMarketing,
    p_submission_fingerprint: input.fingerprint,
  })
  if (error) { console.error("Public request persistence failed", { operation: "create_public_customer_request", code: error.code }); return { outcome: "persistence_error" as const } }
  const row = Array.isArray(data) ? data[0] as { lead_id?: unknown; outcome?: unknown } : null
  return typeof row?.outcome === "string" ? { outcome: row.outcome, leadId: typeof row.lead_id === "string" ? row.lead_id : null } : { outcome: "persistence_error" as const }
}
