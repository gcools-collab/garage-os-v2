import "server-only"

import { cache } from "react"

import { resolvePublicGarageContext } from "@/features/live-stock"
import { getPublicVehicleBySlug } from "@/features/live-stock/data/public-vehicle-repository"
import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"

export const getCachedPublicGarageContext = cache(
  async (garageSlug: string): Promise<PublicGarageContext | null> =>
    resolvePublicGarageContext(garageSlug)
)

export async function getPublicContactVehicle(
  garage: PublicGarageContext,
  vehicleSlug: string | null
): Promise<LiveStockVehicle | null> {
  if (!vehicleSlug) return null
  return getPublicVehicleBySlug(garage, vehicleSlug)
}
