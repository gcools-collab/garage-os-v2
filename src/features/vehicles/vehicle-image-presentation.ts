const VEHICLE_IMAGE_BUCKET = "vehicle-images"

export type VehicleImageLocation = Readonly<{
  url: string | null
  storagePath: string
  garageId: string
  vehicleId: string
  supabaseUrl?: string | null
}>

export function resolveVehicleImagePublicUrl({
  url,
  storagePath,
  garageId,
  vehicleId,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
}: VehicleImageLocation): string | null {
  const persistedUrl = url?.trim()
  if (persistedUrl) return persistedUrl

  const expectedPrefix = `${garageId}/${vehicleId}/`
  const baseUrl = supabaseUrl?.trim().replace(/\/$/, "")
  if (!baseUrl || !storagePath.startsWith(expectedPrefix)) return null

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${baseUrl}/storage/v1/object/public/${VEHICLE_IMAGE_BUCKET}/${encodedPath}`
}

export function isResolvableVehicleImageUrl(
  url: string | null | undefined
): url is string {
  return Boolean(url?.trim())
}
