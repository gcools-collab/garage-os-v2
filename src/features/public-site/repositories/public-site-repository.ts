import "server-only"

import {
  getPublicGarageVehicles,
  resolvePublicGarageContext,
} from "@/features/live-stock"
import { loadPublicSiteRecord, type PublicSiteRecord } from "./public-site-source"

export async function getPublicSiteRecord(
  garageSlug: string
): Promise<PublicSiteRecord | null> {
  return loadPublicSiteRecord(garageSlug, {
    resolveGarage: resolvePublicGarageContext,
    getVehicles: getPublicGarageVehicles,
  })
}
