export const VEHICLE_360_MAX_FRAME_SIZE = 15 * 1024 * 1024
export const VEHICLE_360_MAX_FRAMES = 48

export const VEHICLE_360_MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const

export type Vehicle360MimeType = keyof typeof VEHICLE_360_MIME_EXTENSIONS

export function isVehicle360MimeType(value: string): value is Vehicle360MimeType {
  return Object.hasOwn(VEHICLE_360_MIME_EXTENSIONS, value)
}

export function vehicle360ExtensionForMime(value: string): string | null {
  return isVehicle360MimeType(value) ? VEHICLE_360_MIME_EXTENSIONS[value] : null
}

export function validateVehicle360File(file: Pick<File, "size" | "type">): string | null {
  if (!isVehicle360MimeType(file.type)) return "format non accepté"
  if (file.size <= 0) return "fichier vide"
  if (file.size > VEHICLE_360_MAX_FRAME_SIZE) return "fichier supérieur à 15 Mo"
  return null
}
