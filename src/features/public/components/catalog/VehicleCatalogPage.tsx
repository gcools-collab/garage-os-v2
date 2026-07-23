import Link from "next/link"
import type { LiveVehicleCatalog } from "../../types"
import { VehicleCatalogActiveFilters } from "./VehicleCatalogActiveFilters"
import { VehicleCatalogEmptyState } from "./VehicleCatalogEmptyState"
import { VehicleCatalogFilters } from "./VehicleCatalogFilters"
import { VehicleCatalogGrid } from "./VehicleCatalogGrid"
import { VehicleCatalogHero } from "./VehicleCatalogHero"
import { VehicleCatalogPagination } from "./VehicleCatalogPagination"
import { VehicleCatalogSearch } from "./VehicleCatalogSearch"
import { VehicleCatalogSuggestions } from "./VehicleCatalogSuggestions"
import { VehicleCatalogToolbar } from "./VehicleCatalogToolbar"

export function VehicleCatalogPage({ catalog }: { catalog: LiveVehicleCatalog }) {
  return (
    <main className="bg-[var(--live-background)] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[var(--live-content-width)]">
        <nav aria-label="Fil d’Ariane">
          <ol className="flex flex-wrap gap-2 text-sm text-[var(--live-muted-foreground)]">
            {catalog.heading.breadcrumbs.map((item, index) => {
              const last = index === catalog.heading.breadcrumbs.length - 1
              return <li key={item.id} className="flex gap-2">{index > 0 && <span aria-hidden="true">/</span>}{last ? <span aria-current="page" className="text-[var(--live-foreground)]">{item.label}</span> : <Link href={item.href}>{item.label}</Link>}</li>
            })}
          </ol>
        </nav>
        <div className="mt-10"><VehicleCatalogHero heading={catalog.heading} resultSummary={catalog.resultSummary} /></div>
        <div className="mt-8"><VehicleCatalogSearch search={catalog.search} /></div>
        <div className="mt-8"><VehicleCatalogToolbar catalog={catalog} /></div>
        <div className="mt-5"><VehicleCatalogActiveFilters catalog={catalog} /></div>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <VehicleCatalogFilters filters={catalog.filters} activeFilterCount={catalog.activeFilterCount} />
          <div>
            {catalog.emptyState
              ? <><VehicleCatalogEmptyState state={catalog.emptyState} /><VehicleCatalogSuggestions suggestions={catalog.suggestions} /></>
              : <VehicleCatalogGrid vehicles={catalog.vehicles} />}
            <div className="mt-10"><VehicleCatalogPagination pagination={catalog.pagination} /></div>
          </div>
        </div>
      </div>
    </main>
  )
}
