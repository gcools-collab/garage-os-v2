import type { LiveStockVehicle } from "@/features/live-stock"

export function buildLeadVehicleSnapshot(
  vehicle: Pick<LiveStockVehicle, "title" | "priceCents" | "slug" | "make" | "model" | "year">
) {
  return {
    title: vehicle.title,
    priceCents: vehicle.priceCents,
    slug: vehicle.slug,
    brand: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
  } as const
}
