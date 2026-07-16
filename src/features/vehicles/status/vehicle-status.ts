import { z } from "zod"

export const vehicleStatuses = [
  "PURCHASED",
  "PREPARATION",
  "READY_TO_PUBLISH",
  "PUBLISHED",
  "RESERVED",
  "SOLD",
  "DELIVERED",
  "ARCHIVED",
  "CANCELLED",
] as const

export const vehicleStatusSchema = z.enum(vehicleStatuses)
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  PURCHASED: "Acheté",
  PREPARATION: "En préparation",
  READY_TO_PUBLISH: "Prêt à publier",
  PUBLISHED: "Publié",
  RESERVED: "Réservé",
  SOLD: "Vendu",
  DELIVERED: "Livré",
  ARCHIVED: "Archivé",
  CANCELLED: "Annulé",
}

export function getVehicleStatusLabel(status: VehicleStatus) {
  return vehicleStatusLabels[status]
}

export const vehicleEventTypes = [
  ...vehicleStatuses,
  "PRICE_DROP",
  "MODIFIED",
] as const

export type VehicleEventType = (typeof vehicleEventTypes)[number]

export function getVehicleEventTypeLabel(type: VehicleEventType) {
  if (type === "PRICE_DROP") return "Baisse de prix"
  if (type === "MODIFIED") return "Modification"
  return getVehicleStatusLabel(type)
}
