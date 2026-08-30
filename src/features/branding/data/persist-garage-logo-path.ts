import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Sets `garage_branding.logo_path` without touching any other column. Most garages already have a
 * branding row (created the first time they save Identité du garage), so this updates it in place.
 * A brand-new garage that uploads a logo before ever saving the branding form has no row yet — in
 * that case a minimal row is inserted, satisfying the `display_name` not-null constraint with the
 * session's garage name, without overwriting a display name the owner may already have customized.
 */
export async function persistGarageLogoPath(
  supabase: SupabaseClient,
  garageId: string,
  garageName: string,
  logoPath: string | null
): Promise<{ readonly error: string | null }> {
  const { data: updated, error: updateError } = await supabase
    .from("garage_branding")
    .update({ logo_path: logoPath })
    .eq("garage_id", garageId)
    .select("garage_id")
    .maybeSingle()

  if (updateError) return { error: updateError.message }
  if (updated) return { error: null }

  const { error: insertError } = await supabase
    .from("garage_branding")
    .insert({ garage_id: garageId, display_name: garageName, logo_path: logoPath })

  return { error: insertError?.message ?? null }
}
