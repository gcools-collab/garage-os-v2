import type { LiveVehiclePhoto } from "../types"

export function resolveVehicleCoverPhoto(photos: readonly LiveVehiclePhoto[]) {
  const ordered = [...photos].sort(
    (first, second) => first.position - second.position || first.id.localeCompare(second.id)
  )
  return ordered.find((photo) => photo.isCover) ?? ordered[0] ?? null
}
