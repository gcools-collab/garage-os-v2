import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"

export interface PublicSiteSource {
  resolveGarage(slug: string): Promise<PublicGarageContext | null>
  getVehicles(garage: PublicGarageContext): Promise<readonly LiveStockVehicle[]>
}

export interface PublicSiteRecord {
  readonly garage: PublicGarageContext
  readonly vehicles: readonly LiveStockVehicle[]
}

export async function loadPublicSiteRecord(
  garageSlug: string,
  source: PublicSiteSource
): Promise<PublicSiteRecord | null> {
  const garage = await source.resolveGarage(garageSlug)
  if (!garage) return null
  return {
    garage,
    vehicles: await source.getVehicles(garage),
  }
}
