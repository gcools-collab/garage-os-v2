import type { MarketSearchCriteria } from "../types"

export type MarketVehicle = {
  brand: string | null
  model: string | null
  trim: string | null
  year: number | null
  mileage: number | null
  fuel: string | null
  gearbox: string | null
  powerDin: number | null
}

const LABELS: ReadonlyArray<[keyof MarketVehicle, string]> = [
  ["brand", "marque"], ["model", "modèle"], ["year", "année"],
  ["mileage", "kilométrage"], ["fuel", "carburant"],
]

function present(value: MarketVehicle[keyof MarketVehicle]) {
  return typeof value === "number" ? Number.isFinite(value) && value >= 0 : Boolean(value?.trim())
}

export function getMissingMarketCriteriaFields(vehicle: MarketVehicle): string[] {
  return LABELS.filter(([key]) => {
    if (key === "year") return typeof vehicle.year !== "number" || vehicle.year < 1886 || vehicle.year > new Date().getFullYear() + 1
    if (key === "mileage") return typeof vehicle.mileage !== "number" || !Number.isFinite(vehicle.mileage) || vehicle.mileage < 0
    return !present(vehicle[key])
  }).map(([, label]) => label)
}

export function buildMarketSearchCriteria(vehicle: MarketVehicle): MarketSearchCriteria {
  const missing = getMissingMarketCriteriaFields(vehicle)
  if (missing.length > 0) throw new Error(`Données insuffisantes : ${missing.join(", ")}.`)

  const year = vehicle.year as number
  const mileage = vehicle.mileage as number
  return {
    brand: vehicle.brand!.trim(),
    model: vehicle.model!.trim(),
    trim: vehicle.trim?.trim() || undefined,
    yearFrom: Math.max(1886, year - 2),
    yearTo: year + 2,
    mileageFrom: Math.max(0, mileage - 30_000),
    mileageTo: mileage + 30_000,
    fuel: vehicle.fuel!.trim(),
    gearbox: vehicle.gearbox?.trim() || undefined,
    powerDinFrom: vehicle.powerDin ? Math.max(0, vehicle.powerDin - 30) : undefined,
    powerDinTo: vehicle.powerDin ? vehicle.powerDin + 30 : undefined,
    limit: 30,
  }
}
