export const LEAD_TYPES = [
  "GENERAL_INQUIRY",
  "CALLBACK_REQUEST",
  "APPOINTMENT_REQUEST",
  "TEST_DRIVE_REQUEST",
  "VEHICLE_QUESTION",
  "PRICE_INQUIRY",
] as const
export type LeadType = typeof LEAD_TYPES[number]

export const LEAD_STATUSES = [
  "NEW", "TO_CONTACT", "CONTACTED", "APPOINTMENT_PLANNED",
  "QUALIFIED", "LOST", "WON", "ARCHIVED",
] as const
export type LeadStatus = typeof LEAD_STATUSES[number]

export type LeadSource =
  | "LIVE_VEHICLE_PAGE" | "LIVE_HOMEPAGE" | "LIVE_CATALOG"
  | "PHONE_CTA" | "EMAIL_CTA" | "MANUAL"

export type LeadPriority = "HIGH" | "NORMAL" | "LOW"

export type PublicLeadInput = {
  readonly garageSlug: string
  readonly vehicleSlug: string
  readonly type: string
  readonly customerName: string
  readonly customerPhone: string
  readonly customerEmail: string
  readonly preferredDate: string
  readonly preferredTime: string
  readonly message: string
  readonly consentContact: boolean
  readonly consentMarketing: boolean
  readonly website: string
  readonly formStartedAt: number
  readonly publicPageUrl: string
}

export type ValidatedPublicLeadInput = Omit<
  PublicLeadInput,
  "type" | "customerPhone" | "customerEmail" | "preferredDate" | "preferredTime" | "message"
> & {
  readonly type: LeadType
  readonly customerPhone: string | null
  readonly customerEmail: string | null
  readonly preferredDate: string | null
  readonly preferredTime: string | null
  readonly message: string | null
}

export type PublicLeadActionState = {
  readonly status:
    | "idle" | "success" | "validation_error" | "unavailable_vehicle"
    | "unavailable_garage" | "rate_limited" | "duplicate_submission"
    | "persistence_error"
  readonly message: string
  readonly reference?: string
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>
  readonly values?: Partial<PublicLeadInput>
}

export type LeadRecord = {
  readonly id: string
  readonly garage_id: string
  readonly vehicle_id: string | null
  readonly source: LeadSource
  readonly type: LeadType
  readonly status: LeadStatus
  readonly customer_name: string
  readonly customer_phone: string | null
  readonly customer_email: string | null
  readonly preferred_date: string | null
  readonly preferred_time: string | null
  readonly message: string | null
  readonly public_page_url: string | null
  readonly public_vehicle_slug: string | null
  readonly public_garage_slug: string
  readonly consent_contact: boolean
  readonly consent_marketing: boolean
  readonly vehicle_title_snapshot: string | null
  readonly vehicle_price_snapshot_cents: number | null
  readonly vehicle_brand_snapshot: string | null
  readonly vehicle_model_snapshot: string | null
  readonly vehicle_year_snapshot: number | null
  readonly created_at: string
  readonly updated_at: string
  readonly contacted_at: string | null
  readonly closed_at: string | null
  readonly archived_at: string | null
}

export type LeadEventRecord = {
  readonly id: string
  readonly event_type: string
  readonly from_status: LeadStatus | null
  readonly to_status: LeadStatus | null
  readonly created_at: string
}
