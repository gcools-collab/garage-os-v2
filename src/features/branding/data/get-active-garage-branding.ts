import "server-only"

import { cache } from "react"

import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import { resolveGarageBranding } from "../engine"
import type { ActiveGarageBranding, GarageBrandingRecord } from "../types"
import { resolveGarageBrandingMedia } from "./branding-media"

export const getActiveGarageBranding = cache(async (): Promise<ActiveGarageBranding | null> => {
  const session = await getActiveGarageSession()
  if (!session?.garageId || !session.garageName) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("garage_branding")
    .select(`
      garage_id, display_name, legal_name, logo_path, favicon_path, phone, email,
      website_url, address_line1, address_line2, postal_code, city, country_code,
      short_description, facebook_url, instagram_url, theme_key,
      primary_color, secondary_color, accent_color
    `)
    .eq("garage_id", session.garageId)
    .maybeSingle()

  if (error) {
    console.error("Unable to load active garage branding", { code: error.code, message: error.message })
    throw new Error("Impossible de charger l’identité du garage.")
  }

  const branding = resolveGarageBranding({
    garage: { id: session.garageId, name: session.garageName },
    record: data as GarageBrandingRecord | null,
  })

  return {
    branding,
    canEdit: session.memberRole === "owner" || session.memberRole === "admin",
  }
})

export async function getActiveGarageBrandingMedia() {
  const activeBranding = await getActiveGarageBranding()
  if (!activeBranding) return null
  return resolveGarageBrandingMedia(await createClient(), activeBranding.branding)
}
