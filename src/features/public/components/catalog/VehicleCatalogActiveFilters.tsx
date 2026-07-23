import Link from "next/link"
import type { LiveVehicleCatalog } from "../../types"

export function VehicleCatalogActiveFilters({ catalog }: { catalog: LiveVehicleCatalog }) {
  if (catalog.activeFilters.length === 0) return null
  return (
    <div aria-label="Filtres actifs" className="flex flex-wrap items-center gap-2">
      {catalog.activeFilters.map((filter) => (
        <Link key={filter.id} href={filter.removeHref} aria-label={`Supprimer le filtre ${filter.label} : ${filter.value}`} className="rounded-full border border-[var(--live-border)] bg-[var(--live-muted)] px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-primary)]">
          {filter.label} : {filter.value} ×
        </Link>
      ))}
      {catalog.activeFilters.length > 1 && <Link href={catalog.filters.resetHref} className="text-sm underline underline-offset-4">Tout effacer</Link>}
    </div>
  )
}
