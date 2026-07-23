import type { LiveVehicleCard } from "../../types"
import { PublicVehicleCard } from "../featured"

export function VehicleCatalogGrid({ vehicles }: { vehicles: LiveVehicleCard[] }) {
  return (
    <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {vehicles.map((vehicle) => <PublicVehicleCard key={vehicle.id} vehicle={vehicle} />)}
    </div>
  )
}
