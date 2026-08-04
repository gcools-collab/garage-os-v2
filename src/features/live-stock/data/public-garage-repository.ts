import { mapPublicGarage } from "../mappers"
import type { PublicGarageRecord } from "../types"
import { isPublicServiceId, type GarageServiceConfiguration } from "@/features/public-site/services"
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
  if (!data) return null
  const record = data as unknown as PublicGarageRecord
  const { data: services, error: servicesError } = await createPublicSupabaseClient()
    .from("public_live_garage_services")
    .select("service_key,public_title,public_description,public_cta_label,display_order")
    .eq("garage_slug", slug)
    .order("display_order")
    .order("service_key")
  if (servicesError) throw new Error(`Lecture des services Live impossible (${servicesError.code}).`)
  const configurations: GarageServiceConfiguration[] = (services ?? []).flatMap((row) => {
    const serviceKey = (row as { service_key?: unknown }).service_key
    if (!isPublicServiceId(serviceKey)) return []
    const value = row as {
      public_title: string | null
      public_description: string | null
      public_cta_label: string | null
      display_order: number
    }
    return [{
      serviceKey,
      status: "ENABLED" as const,
      publicTitle: value.public_title,
      publicDescription: value.public_description,
      publicCtaLabel: value.public_cta_label,
      displayOrder: value.display_order,
    }]
  })
  return mapPublicGarage(record, configurations)
}
