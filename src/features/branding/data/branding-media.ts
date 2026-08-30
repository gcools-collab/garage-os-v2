import type { SupabaseClient } from "@supabase/supabase-js"

import type { GarageBranding } from "../types"
import type { GarageBrandingMedia } from "../presentation"

export const GARAGE_BRANDING_BUCKET = "garage-branding"

export function publicMediaUrl(
  supabase: SupabaseClient,
  garageId: string,
  path: string | null
) {
  if (!path || !path.startsWith(`${garageId}/`)) return null
  return supabase.storage.from(GARAGE_BRANDING_BUCKET).getPublicUrl(path).data.publicUrl
}

export function resolveGarageBrandingMedia(
  supabase: SupabaseClient,
  branding: GarageBranding
): GarageBrandingMedia {
  return {
    logoUrl: publicMediaUrl(supabase, branding.garageId, branding.logoPath),
    faviconUrl: publicMediaUrl(supabase, branding.garageId, branding.faviconPath),
  }
}
