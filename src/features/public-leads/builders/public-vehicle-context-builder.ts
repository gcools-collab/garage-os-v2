import type { LiveStockVehicle } from "@/features/live-stock"
import type { PublicRequestType, PublicVehicleContextViewModel } from "../types"

const price = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
const number = new Intl.NumberFormat("fr-FR")

export function buildPublicVehicleContext(vehicle: LiveStockVehicle): PublicVehicleContextViewModel {
  const cover = vehicle.photos.find((photo) => photo.isCover) ?? vehicle.photos[0] ?? null
  return {
    slug: vehicle.slug,
    imageUrl: cover?.url ?? null,
    imageAlt: cover?.alt || `${vehicle.make} ${vehicle.model}`,
    title: `${vehicle.make} ${vehicle.model}`,
    subtitle: vehicle.version,
    metadata: [vehicle.year, vehicle.mileageKm === null ? null : `${number.format(vehicle.mileageKm)} km`].filter(Boolean).join(" · "),
    price: vehicle.priceCents === null ? "Prix sur demande" : price.format(vehicle.priceCents / 100),
  }
}

export function getVehicleContextHeading(type: PublicRequestType, vehicleTitle: string) {
  if (type === "TEST_DRIVE") return "Votre demande d’essai concerne"
  if (type === "TRADE_IN") return `Vous souhaitez faire reprendre votre véhicule pour cette ${vehicleTitle}`
  return `Une question sur cette ${vehicleTitle} ?`
}
