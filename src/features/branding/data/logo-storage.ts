import type { SupabaseClient } from "@supabase/supabase-js"

import { GARAGE_BRANDING_BUCKET } from "./branding-media"

export type LogoStorageResult = { readonly path: string | null; readonly error: string | null }

/**
 * A garage keeps at most one logo object at all times. Because the extension can change between
 * uploads (e.g. a PNG replaced by a JPEG), a plain `upsert` on a fixed filename is not enough to
 * avoid an orphaned object from a previous extension — so any existing `logo.*` object for this
 * garage is removed before the new one is written.
 */
export async function replaceGarageLogoObject(
  supabase: SupabaseClient,
  garageId: string,
  file: File,
  extension: string
): Promise<LogoStorageResult> {
  const { data: existing } = await supabase.storage.from(GARAGE_BRANDING_BUCKET).list(garageId)
  const stale = (existing ?? [])
    .filter((entry) => entry.name.startsWith("logo."))
    .map((entry) => `${garageId}/${entry.name}`)
  if (stale.length > 0) {
    await supabase.storage.from(GARAGE_BRANDING_BUCKET).remove(stale)
  }

  const path = `${garageId}/logo.${extension}`
  const { error } = await supabase.storage
    .from(GARAGE_BRANDING_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true })

  if (error) return { path: null, error: error.message }
  return { path, error: null }
}

export async function removeGarageLogoObject(
  supabase: SupabaseClient,
  garageId: string,
  logoPath: string | null
): Promise<{ readonly error: string | null }> {
  if (!logoPath || !logoPath.startsWith(`${garageId}/`)) return { error: null }
  const { error } = await supabase.storage.from(GARAGE_BRANDING_BUCKET).remove([logoPath])
  return { error: error?.message ?? null }
}
