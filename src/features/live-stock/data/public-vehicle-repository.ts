import { mapPublicVehicle } from "../mappers"
import type {
  LiveStockVehicle,
  PublicGarageContext,
  PublicVehicleImageRecord,
  PublicVehicleQuery,
  PublicVehicleRecord,
} from "../types"
import { createPublicSupabaseClient } from "./public-supabase-client"

export const PUBLIC_VEHICLE_COLUMNS = [
  "id", "garage_id", "live_slug", "brand", "model", "version", "year",
  "mileage", "fuel", "gearbox", "body_type", "power_din", "fiscal_power",
  "doors", "seats", "color", "first_registration_date", "selling_price",
  "description", "status", "publication_status", "published_at", "created_at",
  "updated_at", "co2_emissions", "crit_air", "euro_standard", "owners_count",
].join(",")

export const PUBLIC_IMAGE_COLUMNS =
  "id,vehicle_id,garage_id,storage_path,is_primary,created_at"

export async function getPublicGarageVehicles(
  garage: PublicGarageContext,
  query: PublicVehicleQuery = {}
): Promise<readonly LiveStockVehicle[]> {
  const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize ?? 100)))
  const page = Math.max(1, Math.floor(query.page ?? 1))
  const from = (page - 1) * pageSize
  const supabase = createPublicSupabaseClient()
  const { data: rows, error } = await supabase
    .from("public_live_vehicles")
    .select(PUBLIC_VEHICLE_COLUMNS)
    .eq("garage_id", garage.garageId)
    .order("published_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1)
  if (error) throw new Error(`Lecture du stock Live impossible (${error.code}).`)
  const vehicles = (rows ?? []) as unknown as PublicVehicleRecord[]
  if (vehicles.length === 0) return []
  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  const { data: images, error: imageError } = await supabase
    .from("public_live_vehicle_images")
    .select(PUBLIC_IMAGE_COLUMNS)
    .eq("garage_id", garage.garageId)
    .in("vehicle_id", vehicleIds)
    .order("created_at", { ascending: true })
  if (imageError) throw new Error(`Lecture des photos Live impossible (${imageError.code}).`)
  return vehicles.map((vehicle) =>
    mapPublicVehicle(vehicle, (images ?? []) as unknown as PublicVehicleImageRecord[])
  )
}

export async function getPublicVehicleBySlug(
  garage: PublicGarageContext,
  vehicleSlug: string
) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vehicleSlug)) return null
  const supabase = createPublicSupabaseClient()
  const { data, error } = await supabase
    .from("public_live_vehicles")
    .select(PUBLIC_VEHICLE_COLUMNS)
    .eq("garage_id", garage.garageId)
    .eq("live_slug", vehicleSlug)
    .maybeSingle()
  if (error) throw new Error(`Lecture de la fiche Live impossible (${error.code}).`)
  if (!data) return null
  const vehicle = data as unknown as PublicVehicleRecord
  const { data: images, error: imageError } = await supabase
    .from("public_live_vehicle_images")
    .select(PUBLIC_IMAGE_COLUMNS)
    .eq("garage_id", garage.garageId)
    .eq("vehicle_id", vehicle.id)
    .order("created_at", { ascending: true })
  if (imageError) throw new Error(`Lecture des photos Live impossible (${imageError.code}).`)
  return mapPublicVehicle(
    vehicle,
    (images ?? []) as unknown as PublicVehicleImageRecord[]
  )
}

export async function getPublicFeaturedVehicles(
  garage: PublicGarageContext,
  limit = 6
) {
  const vehicles = await getPublicGarageVehicles(garage)
  return vehicles
    .filter((vehicle) => vehicle.photos.length > 0)
    .slice(0, Math.max(0, limit))
}

export async function getPublicSimilarVehicles(
  garage: PublicGarageContext,
  vehicle: LiveStockVehicle,
  limit = 3
) {
  const vehicles = await getPublicGarageVehicles(garage)
  return vehicles
    .filter((candidate) => candidate.id !== vehicle.id)
    .sort((first, second) => {
      const firstScore = Number(first.make === vehicle.make) + Number(first.bodyType === vehicle.bodyType)
      const secondScore = Number(second.make === vehicle.make) + Number(second.bodyType === vehicle.bodyType)
      return secondScore - firstScore || first.slug.localeCompare(second.slug)
    })
    .slice(0, Math.max(0, limit))
}
