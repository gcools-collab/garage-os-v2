import { mapPublicGarage } from "../mappers"
import type { PublicGarageRecord } from "../types"
import { createPublicSupabaseClient } from "./public-supabase-client"

const PUBLIC_GARAGE_COLUMNS = [
  "garage_id", "live_slug", "live_enabled", "display_name", "logo_path",
  "favicon_path", "phone", "email", "website_url", "address_line1",
  "address_line2", "postal_code", "city", "country_code", "short_description",
  "facebook_url", "instagram_url", "theme_key", "primary_color",
  "secondary_color", "accent_color",
].join(",")

export async function resolvePublicGarageContext(garageSlug: string) {
  const slug = garageSlug.trim().toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
  const { data, error } = await createPublicSupabaseClient()
    .from("public_live_garages")
    .select(PUBLIC_GARAGE_COLUMNS)
    .eq("live_slug", slug)
    .maybeSingle()
  if (error) throw new Error(`Lecture du garage Live impossible (${error.code}).`)
  return data ? mapPublicGarage(data as unknown as PublicGarageRecord) : null
}
