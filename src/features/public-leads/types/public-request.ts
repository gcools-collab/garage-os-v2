export const PUBLIC_REQUEST_TYPES = [
  "VEHICLE_INQUIRY", "TEST_DRIVE", "TRADE_IN", "CONSIGNMENT",
  "REGISTRATION", "ENGINE_CLEANING", "GENERAL_CONTACT",
  "RENTAL", "WORKSHOP", "BODYWORK",
] as const
export type PublicRequestType = typeof PUBLIC_REQUEST_TYPES[number]
export type PublicRequestSource = "PUBLIC_WEBSITE" | "VEHICLE_DETAIL" | "CONTACT_CENTER" | "SERVICE_PAGE" | "CONSIGNMENT_PAGE"
export type PublicRequestState = {
  readonly status: "idle" | "success" | "validation_error" | "unavailable" | "rate_limited" | "duplicate_submission" | "persistence_error"
  readonly message: string
  readonly reference?: string
  readonly appointmentStatus?: "PENDING" | "CONFIRMED" | "AWAITING_PAYMENT"
  readonly confirmationStatus?: "PENDING_CONFIRMATION"
  readonly paymentUrl?: string
  readonly registrationUrl?: string
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>
}
export type PublicRequestField = {
  readonly name: string
  readonly label: string
  readonly type: "text" | "email" | "tel" | "number" | "date" | "textarea" | "select"
  readonly required: boolean
  readonly options?: readonly { readonly value: string; readonly label: string }[]
  readonly hint?: string
  readonly placeholder?: string
  readonly step: string
}
export type PublicVehicleContextViewModel = {
  readonly slug: string
  readonly imageUrl: string | null
  readonly imageAlt: string
  readonly title: string
  readonly subtitle: string | null
  readonly metadata: string
  readonly price: string
}
export type PublicRequestFormViewModel = {
  readonly type: PublicRequestType
  readonly title: string
  readonly description: string
  readonly submitLabel: string
  readonly fields: readonly PublicRequestField[]
  readonly steps: readonly { readonly id: string; readonly title: string }[]
  readonly contextHeading: string | null
}
