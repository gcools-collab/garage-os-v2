import Link from "next/link"
import type { LiveVehicleCatalog } from "../../types"

export function VehicleCatalogSearch({ search }: { search: LiveVehicleCatalog["search"] }) {
  return (
    <form action="/vehicles" method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
      {search.preservedParams.map((param) => <input key={param.name} type="hidden" name={param.name} value={param.value} />)}
      <label htmlFor="catalog-search" className="sr-only">Rechercher un véhicule</label>
      <input id="catalog-search" type="search" name="q" defaultValue={search.value} placeholder={search.placeholder} className="min-h-12 flex-1 rounded-[var(--live-control-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] px-4" />
      <button type="submit" className="min-h-12 rounded-[var(--live-control-radius)] bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)]">{search.submitLabel}</button>
      {search.clearHref && <Link href={search.clearHref} aria-label={`Effacer la recherche ${search.value}`} className="self-center text-sm underline underline-offset-4">Effacer</Link>}
    </form>
  )
}
