import { buildAssetImageViewModel, type VehicleAssetGallery } from "@/features/media"
import type { LiveStockVehicle } from "@/features/live-stock"
import { formatPublicVehicleDisplayName, formatVehicleMileage } from "@/features/vehicles/vehicle-presentation"
import type { GaragePublicViewModel } from "../../types"
import type { VehicleHeroViewModel } from "../presentation"

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0,
})

export class VehicleHeroBuilder {
  build(
    vehicle: LiveStockVehicle,
    garage: GaragePublicViewModel,
    media: VehicleAssetGallery
  ): VehicleHeroViewModel {
    return {
      eyebrow: garage.name,
      title: formatPublicVehicleDisplayName(vehicle.make, vehicle.model),
      version: vehicle.version,
      price: vehicle.priceCents === null
        ? "Prix sur demande"
        : money.format(vehicle.priceCents / 100),
      availabilityLabel: "Disponible",
      cover: buildAssetImageViewModel(media.cover, "desktop"),
      metadata: [
        vehicle.year === null ? null : { label: "Année", value: String(vehicle.year) },
        { label: "Kilométrage", value: formatVehicleMileage(vehicle.mileageKm) },
        vehicle.fuelType ? { label: "Énergie", value: vehicle.fuelType } : null,
        vehicle.transmission ? { label: "Boîte", value: vehicle.transmission } : null,
      ].filter((item): item is NonNullable<typeof item> => item !== null),
    }
  }
}
