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
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>
}
export type PublicRequestField = {
  readonly name: string
  readonly label: string
  readonly type: "text" | "email" | "tel" | "number" | "date" | "textarea" | "select"
  readonly required: boolean
  readonly options?: readonly { readonly value: string; readonly label: string }[]
  readonly hint?: string
}
export type PublicRequestFormViewModel = {
  readonly type: PublicRequestType
  readonly title: string
  readonly description: string
  readonly submitLabel: string
  readonly fields: readonly PublicRequestField[]
}

