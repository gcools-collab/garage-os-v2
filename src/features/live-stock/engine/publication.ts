import type {
  LiveStockVehicle,
  PublicGarageContext,
  PublicationValidation,
} from "../types"

const HIDDEN_STATUSES = new Set(["SOLD", "DELIVERED", "ARCHIVED", "CANCELLED"])

export function isVehiclePubliclyVisible({
  vehicle,
  garage,
  now = new Date(),
}: {
  readonly vehicle: LiveStockVehicle
  readonly garage: PublicGarageContext
  readonly now?: Date
}) {
  if (garage.status !== "ACTIVE" || vehicle.garageId !== garage.garageId) return false
  if (vehicle.publicationStatus !== "PUBLISHED" || HIDDEN_STATUSES.has(vehicle.status)) return false
  if (!vehicle.publishedAt) return false
  const publishedAt = Date.parse(vehicle.publishedAt)
  return Number.isFinite(publishedAt) && publishedAt <= now.getTime()
}

export function validateVehicleForPublication(
  vehicle: Pick<
    LiveStockVehicle,
    "make" | "model" | "priceCents" | "description" | "photos" | "year" | "mileageKm"
  >
): PublicationValidation {
  const required = [
    ["Marque", vehicle.make],
    ["Modèle", vehicle.model],
    ["Prix de vente", vehicle.priceCents],
    ["Description", vehicle.description],
    ["Photo", vehicle.photos.length],
  ] as const
  const missingFields = required
    .filter(([, value]) => value === null || value === "" || value === 0)
    .map(([label]) => label)
  const warnings = [
    vehicle.year === null ? "Année non renseignée" : null,
    vehicle.mileageKm === null ? "Kilométrage non renseigné" : null,
  ].filter((warning): warning is string => warning !== null)
  return { canPublish: missingFields.length === 0, missingFields, warnings }
}

export function selectRecentVehicles(
  vehicles: readonly LiveStockVehicle[],
  now = new Date(),
  days = 30
) {
  const threshold = now.getTime() - days * 86_400_000
  return vehicles.filter((vehicle) => {
    const publishedAt = vehicle.publishedAt ? Date.parse(vehicle.publishedAt) : Number.NaN
    return Number.isFinite(publishedAt) && publishedAt >= threshold && publishedAt <= now.getTime()
  })
}
