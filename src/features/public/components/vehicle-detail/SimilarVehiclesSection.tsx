import type { LiveVehicleCard } from "../../types"
import { PublicVehicleCard } from "../featured"
import { SectionHeader } from "../ui"

export function SimilarVehiclesSection({ vehicles }: { vehicles: LiveVehicleCard[] }) {
  if (vehicles.length === 0) return null
  return (
    <section aria-label="Véhicules similaires">
      <SectionHeader
        eyebrow="Notre sélection"
        title="Vous aimerez aussi"
        description="D’autres véhicules disponibles sélectionnés par notre équipe."
      />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => <PublicVehicleCard key={vehicle.id} vehicle={vehicle} />)}
      </div>
    </section>
  )
}
