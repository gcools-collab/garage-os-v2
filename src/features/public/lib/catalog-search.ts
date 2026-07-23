import type { Collection, Vehicle } from "../types"

export function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function tokenizeCatalogQuery(value: string) {
  return normalizeCatalogText(value)
    .split(" ")
    .filter((token) => token && (!/^[a-z]$/.test(token) || /^\d+$/.test(token)))
}

export function buildVehicleSearchDocument(
  vehicle: Vehicle,
  collections: readonly Collection[]
) {
  const collectionNames = collections
    .filter((collection) => vehicle.collectionIds.includes(collection.id))
    .map((collection) => collection.name)
  const equipment = vehicle.equipmentGroups?.flatMap((group) => group.items) ?? []
  return normalizeCatalogText([
    vehicle.brand,
    vehicle.model,
    vehicle.trim,
    vehicle.year,
    vehicle.fuel,
    vehicle.gearbox,
    vehicle.exteriorColor,
    vehicle.reference,
    ...(vehicle.highlights ?? []),
    ...equipment,
    ...collectionNames,
  ].filter((value) => value !== undefined).join(" "))
}
