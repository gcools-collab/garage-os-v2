import type { Vehicle } from "../../types"
import { SectionHeader } from "../ui"
import { FeaturedVehicleCard } from "./FeaturedVehicleCard"

export function FeaturedVehiclesSection({
  vehicles,
}: {
  vehicles: Vehicle[]
}) {
  if (vehicles.length === 0) return null

  return (
    <section
      aria-label="Véhicules à découvrir"
      className="bg-[var(--live-background)] px-5 py-20 sm:px-8 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[var(--live-content-width)]">
        <SectionHeader
          eyebrow="Véhicules"
          title="Nos véhicules à découvrir"
          description="Une sélection de véhicules préparés avec exigence et disponibles immédiatement."
        />
        <div className="mt-10 grid items-stretch gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <FeaturedVehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </div>
    </section>
  )
}
