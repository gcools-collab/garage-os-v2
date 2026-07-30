import type { Collection } from "@/features/public"
import type { LiveStockVehicle } from "../types"

export function buildLiveStockCollections(
  vehicles: readonly LiveStockVehicle[],
  now = new Date()
): readonly Collection[] {
  const definitions = [
    { id: "nouveautes", name: "Nouveautés", test: (v: LiveStockVehicle) => Boolean(v.publishedAt && Date.parse(v.publishedAt) >= now.getTime() - 30 * 86_400_000) },
    { id: "automatiques", name: "Automatiques", test: (v: LiveStockVehicle) => /auto/i.test(v.transmission ?? "") },
    { id: "moins-15000", name: "Moins de 15 000 €", test: (v: LiveStockVehicle) => v.priceCents !== null && v.priceCents < 1_500_000 },
    { id: "faible-kilometrage", name: "Faible kilométrage", test: (v: LiveStockVehicle) => v.mileageKm !== null && v.mileageKm < 60_000 },
  ] as const
  return definitions.flatMap((definition, index) => {
    const vehicleIds = vehicles.filter(definition.test).map((vehicle) => vehicle.id)
    return vehicleIds.length === 0 ? [] : [{
      id: definition.id,
      slug: definition.id,
      name: definition.name,
      description: `Découvrez notre sélection ${definition.name.toLocaleLowerCase("fr-FR")}.`,
      vehicleIds,
      active: true,
      order: index + 1,
    }]
  })
}
