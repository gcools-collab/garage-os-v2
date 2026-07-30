import type { LiveVehicleCatalogQuery } from "@/features/public"
import {
  buildPublicCatalog,
  buildPublicHomepage,
  buildPublicVehicleDetail,
} from "../builders"
import {
  getPublicGarageVehicles,
  resolvePublicGarageContext,
} from "../data"

export async function getPublicLiveHomepage(garageSlug: string) {
  const garage = await resolvePublicGarageContext(garageSlug)
  if (!garage) return null
  const vehicles = await getPublicGarageVehicles(garage)
  return { garage, homepage: buildPublicHomepage({ garage, vehicles }) }
}

export async function getPublicLiveCatalog(
  garageSlug: string,
  query: LiveVehicleCatalogQuery
) {
  const garage = await resolvePublicGarageContext(garageSlug)
  if (!garage) return null
  const vehicles = await getPublicGarageVehicles(garage)
  return {
    garage,
    homepage: buildPublicHomepage({ garage, vehicles }),
    catalog: buildPublicCatalog({ garage, vehicles, query }),
  }
}

export async function getPublicLiveVehicleDetail(
  garageSlug: string,
  vehicleSlug: string
) {
  const garage = await resolvePublicGarageContext(garageSlug)
  if (!garage) return null
  const vehicles = await getPublicGarageVehicles(garage)
  const detail = buildPublicVehicleDetail({ garage, vehicles, vehicleSlug })
  return detail
    ? { garage, homepage: buildPublicHomepage({ garage, vehicles }), detail }
    : null
}
