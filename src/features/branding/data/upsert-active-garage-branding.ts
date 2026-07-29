import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { GarageBrandingRecord, GarageBrandingUpdateInput } from "../types"

export async function upsertActiveGarageBrandingRecord(
  garageId: string,
  input: GarageBrandingUpdateInput
): Promise<{ readonly data: GarageBrandingRecord | null; readonly error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("garage_branding")
    .upsert({
      garage_id: garageId,
      display_name: input.displayName,
      legal_name: input.legalName ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website_url: input.websiteUrl ?? null,
      address_line1: input.addressLine1 ?? null,
      address_line2: input.addressLine2 ?? null,
      postal_code: input.postalCode ?? null,
      city: input.city ?? null,
      country_code: input.countryCode ?? "FR",
      short_description: input.shortDescription ?? null,
      facebook_url: input.facebookUrl ?? null,
      instagram_url: input.instagramUrl ?? null,
      theme_key: input.themeKey ?? "default",
      primary_color: input.primaryColor ?? null,
      secondary_color: input.secondaryColor ?? null,
      accent_color: input.accentColor ?? null,
    }, { onConflict: "garage_id" })
    .select(`
      garage_id, display_name, legal_name, logo_path, favicon_path, phone, email,
      website_url, address_line1, address_line2, postal_code, city, country_code,
      short_description, facebook_url, instagram_url, theme_key,
      primary_color, secondary_color, accent_color
    `)
    .single()

  if (error) {
    console.error("Unable to upsert active garage branding", { code: error.code, message: error.message })
  }
  return { data: data as GarageBrandingRecord | null, error: error?.message ?? null }
}
