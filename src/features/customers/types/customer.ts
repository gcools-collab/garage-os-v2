export const CUSTOMER_SOURCES = [
  "GARAGE_OS",
  "WORDPRESS",
  "WOOCOMMERCE",
  "YITH",
  "ELEMENTOR",
  "MANUAL",
  "OTHER",
] as const

export type CustomerSource = (typeof CUSTOMER_SOURCES)[number]

export type CustomerRecord = {
  readonly id: string
  readonly garage_id: string
  readonly first_name: string | null
  readonly last_name: string | null
  readonly email: string | null
  readonly normalized_email: string | null
  readonly phone: string | null
  readonly normalized_phone: string | null
  readonly address_line: string | null
  readonly postal_code: string | null
  readonly city: string | null
  readonly source: CustomerSource
  readonly external_id: string | null
  readonly notes: string | null
  readonly created_at: string
  readonly updated_at: string
}

export type CustomerVehicleRecord = {
  readonly id: string
  readonly garage_id: string
  readonly customer_id: string
  readonly stock_vehicle_id: string | null
  readonly registration_number: string | null
  readonly vin: string | null
  readonly brand: string | null
  readonly model: string | null
  readonly version: string | null
  readonly first_registration_date: string | null
  readonly source: CustomerSource
  readonly created_at: string
  readonly updated_at: string
}

export type HistoricalPaymentRecord = {
  readonly id: string
  readonly garage_id: string
  readonly customer_id: string | null
  readonly source: string
  readonly external_order_id: string
  readonly amount_cents: number
  readonly currency: string
  readonly source_status: string
  readonly occurred_at: string | null
  readonly created_at: string
}

export type CustomerDirectoryQuery = {
  readonly q?: string
  readonly sort?: "recent" | "name" | "activity"
  readonly page: number
}

export type CustomerDirectoryPage = {
  readonly customers: readonly CustomerRecord[]
  readonly summaries: Readonly<Record<string, CustomerDirectorySummary>>
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

export type CustomerDirectorySummary = {
  readonly vehicleCount: number
  readonly lastInteractionAt: string | null
  readonly nextAppointmentAt: string | null
  readonly nextAppointmentLabel: string | null
}

export type CustomerUpsertInput = {
  readonly firstName: string | null
  readonly lastName: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly addressLine: string | null
  readonly postalCode: string | null
  readonly city: string | null
  readonly notes: string | null
}

export type CustomerVehicleInput = {
  readonly registrationNumber: string | null
  readonly vin: string | null
  readonly brand: string | null
  readonly model: string | null
  readonly version: string | null
  readonly firstRegistrationDate: string | null
  readonly stockVehicleId: string | null
}

export const customerSourceLabels: Readonly<Record<CustomerSource, string>> = {
  GARAGE_OS: "Garage OS",
  WORDPRESS: "Historique importé",
  WOOCOMMERCE: "Historique importé",
  YITH: "Historique importé",
  ELEMENTOR: "Historique importé",
  MANUAL: "Saisie manuelle",
  OTHER: "Autre source",
}

export function isImportedCustomerSource(source: CustomerSource): boolean {
  return source !== "GARAGE_OS" && source !== "MANUAL"
}
