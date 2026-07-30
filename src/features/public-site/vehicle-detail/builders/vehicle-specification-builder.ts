import type { LiveStockVehicle } from "@/features/live-stock"
import type { VehicleSpecificationViewModel } from "../presentation"

const integer = new Intl.NumberFormat("fr-FR")

export class VehicleSpecificationBuilder {
  build(vehicle: LiveStockVehicle): readonly VehicleSpecificationViewModel[] {
    return [
      vehicle.year === null ? null : { label: "Année", value: String(vehicle.year) },
      vehicle.mileageKm === null ? null : { label: "Kilométrage", value: `${integer.format(vehicle.mileageKm)} km` },
      vehicle.fuelType ? { label: "Énergie", value: vehicle.fuelType } : null,
      vehicle.transmission ? { label: "Boîte de vitesses", value: vehicle.transmission } : null,
      vehicle.powerHp === null ? null : { label: "Puissance DIN", value: `${integer.format(vehicle.powerHp)} ch` },
      vehicle.fiscalPower === null ? null : { label: "Puissance fiscale", value: `${vehicle.fiscalPower} CV` },
      vehicle.doors === null ? null : { label: "Portes", value: String(vehicle.doors) },
      vehicle.seats === null ? null : { label: "Places", value: String(vehicle.seats) },
      vehicle.color ? { label: "Couleur", value: vehicle.color } : null,
      vehicle.co2Emissions === null ? null : { label: "Émissions CO₂", value: `${vehicle.co2Emissions} g/km` },
      vehicle.bodyType ? { label: "Carrosserie", value: vehicle.bodyType } : null,
      vehicle.euroStandard ? { label: "Norme Euro", value: vehicle.euroStandard } : null,
    ].filter((item): item is VehicleSpecificationViewModel => item !== null)
  }
}
