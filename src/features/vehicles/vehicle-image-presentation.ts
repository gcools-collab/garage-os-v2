const VEHICLE_IMAGE_BUCKET = "vehicle-images"

export type VehicleImageLocation = Readonly<{
  url: string | null
  storagePath: string
  garageId: string
  vehicleId: string
  supabaseUrl?: string | null
}>

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function isRootRelativePath(url: string) {
  return url.startsWith("/") && !url.startsWith("//")
}

function isPublicHttpUrl(url: string) {
  try {
    const parsed = new URL(url)
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !isLocalHostname(parsed.hostname)
  } catch {
    return false
  }
}

export function isResolvableVehicleImageUrl(
  url: string | null | undefined
): url is string {
  const value = url?.trim()
  if (!value) return false
  return isPublicHttpUrl(value) || isRootRelativePath(value)
}

function storagePublicUrl(
  storagePath: string,
  garageId: string,
  vehicleId: string,
  supabaseUrl: string | null | undefined,
): string | null {
  const expectedPrefix = `${garageId}/${vehicleId}/`
  const baseUrl = supabaseUrl?.trim().replace(/\/$/, "")
  if (!baseUrl || !storagePath.startsWith(expectedPrefix)) return null

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${baseUrl}/storage/v1/object/public/${VEHICLE_IMAGE_BUCKET}/${encodedPath}`
}

export function resolveVehicleImagePublicUrl({
  url,
  storagePath,
  garageId,
  vehicleId,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
}: VehicleImageLocation): string | null {
  const persisted = url?.trim() ?? ""
  if (persisted && isPublicHttpUrl(persisted)) return persisted
  const reconstructed = storagePublicUrl(storagePath, garageId, vehicleId, supabaseUrl)
  if (reconstructed) return reconstructed
  return persisted && isRootRelativePath(persisted) ? persisted : null
}
