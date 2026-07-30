import { createPublicSupabaseClient } from "./public-supabase-client"

export type PublicSitemapEntry = {
  readonly garageSlug: string
  readonly vehicleSlug: string | null
  readonly updatedAt: string | null
}

export async function getPublicSitemapEntries(): Promise<readonly PublicSitemapEntry[]> {
  const supabase = createPublicSupabaseClient()
  const { data: garages, error: garageError } = await supabase
    .from("public_live_garages")
    .select("garage_id,live_slug")
    .order("live_slug")
  if (garageError) throw new Error(`Lecture sitemap garages impossible (${garageError.code}).`)
  const garageRows = (garages ?? []) as unknown as Array<{
    garage_id: string
    live_slug: string
  }>
  if (garageRows.length === 0) return []
  const { data: vehicles, error: vehicleError } = await supabase
    .from("public_live_vehicles")
    .select("garage_id,live_slug,updated_at")
    .in("garage_id", garageRows.map((garage) => garage.garage_id))
    .order("garage_id")
    .order("live_slug")
  if (vehicleError) throw new Error(`Lecture sitemap véhicules impossible (${vehicleError.code}).`)
  const vehicleRows = (vehicles ?? []) as unknown as Array<{
    garage_id: string
    live_slug: string
    updated_at: string
  }>
  return garageRows.flatMap((garage) => [
    { garageSlug: garage.live_slug, vehicleSlug: null, updatedAt: null },
    ...vehicleRows
      .filter((vehicle) => vehicle.garage_id === garage.garage_id)
      .map((vehicle) => ({
        garageSlug: garage.live_slug,
        vehicleSlug: vehicle.live_slug,
        updatedAt: vehicle.updated_at,
      })),
  ])
}
