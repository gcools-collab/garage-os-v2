import type { LiveVehicleCard } from "../../types"
import { FeaturedVehicleCard } from "../featured"

export function VehicleCatalogGrid({ vehicles }: { vehicles: LiveVehicleCard[] }) {
  return (
    <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {vehicles.map((vehicle) => <FeaturedVehicleCard key={vehicle.id} vehicle={vehicle} />)}
    </div>
  )
}
