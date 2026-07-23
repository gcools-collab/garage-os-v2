import type { LiveVehicleCatalog } from "../../types"

export function VehicleCatalogToolbar({ catalog }: { catalog: LiveVehicleCatalog }) {
  const values = catalog.filters.formValues
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--live-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="text-sm text-[var(--live-muted-foreground)]">{catalog.resultCount} résultat{catalog.resultCount > 1 ? "s" : ""}</p>
      <form action="/vehicles" method="get" className="flex items-center gap-3">
        {(["collection", "brand", "fuel", "gearbox", "minPrice", "maxPrice"] as const).map((key) => values[key] !== undefined && <input key={key} type="hidden" name={key} value={values[key]} />)}
        <label htmlFor="catalog-sort" className="text-sm font-medium">Trier par</label>
        <select id="catalog-sort" name="sort" defaultValue={values.sort} className="min-h-11 rounded-[var(--live-control-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] px-3">
          {catalog.filters.sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button type="submit" className="min-h-11 rounded-[var(--live-control-radius)] border border-[var(--live-border)] px-4 text-sm font-semibold">Trier</button>
      </form>
    </div>
  )
}
