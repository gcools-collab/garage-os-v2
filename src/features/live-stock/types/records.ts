export type PublicGarageRecord = {
  readonly garage_id: string
  readonly live_slug: string
  readonly live_enabled: boolean
  readonly display_name: string
  readonly logo_path: string | null
  readonly favicon_path: string | null
  readonly phone: string | null
  readonly email: string | null
  readonly website_url: string | null
  readonly address_line1: string | null
  readonly address_line2: string | null
  readonly postal_code: string | null
  readonly city: string | null
  readonly country_code: string
  readonly short_description: string | null
  readonly facebook_url: string | null
  readonly instagram_url: string | null
  readonly theme_key: string
  readonly primary_color: string | null
  readonly secondary_color: string | null
  readonly accent_color: string | null
}

export type PublicVehicleRecord = {
  readonly id: string
  readonly garage_id: string
  readonly live_slug: string
  readonly brand: string
  readonly model: string
  readonly version: string | null
  readonly year: number | null
  readonly mileage: number | null
  readonly fuel: string | null
  readonly gearbox: string | null
  readonly body_type: string | null
  readonly power_din: number | null
  readonly fiscal_power: number | null
  readonly doors: number | null
  readonly seats: number | null
  readonly color: string | null
  readonly first_registration_date: string | null
  readonly selling_price: number | null
  readonly description: string | null
  readonly status: string
  readonly publication_status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED"
  readonly published_at: string | null
  readonly created_at: string
  readonly updated_at: string
  readonly co2_emissions: number | null
  readonly crit_air: number | null
  readonly euro_standard: string | null
  readonly owners_count: number | null
}

export type PublicVehicleImageRecord = {
  readonly id: string
  readonly vehicle_id: string
  readonly garage_id: string
  readonly storage_path: string
  readonly is_primary: boolean
  readonly created_at: string
}
