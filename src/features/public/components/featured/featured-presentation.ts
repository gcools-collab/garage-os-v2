import type { Vehicle } from "../../types"

export function getVehicleDisplayName(vehicle: Vehicle) {
  return [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" ")
}

export function getVehicleHref(vehicle: Vehicle) {
  return `/vehicles/${encodeURIComponent(vehicle.slug)}`
}
