import Link from "next/link"
import type { LiveVehicleCatalog } from "../../types"

export function VehicleCatalogFilters({ filters }: { filters: LiveVehicleCatalog["filters"] }) {
  const values = filters.formValues
  return (
    <details open className="rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] p-5">
      <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)]">Filtres</summary>
      <form action="/vehicles" method="get" className="mt-6 space-y-5">
        {values.collection && <input type="hidden" name="collection" value={values.collection} />}
        <FilterSelect name="brand" label="Marque" value={values.brand} options={filters.brands} />
        <FilterSelect name="fuel" label="Carburant" value={values.fuel} options={filters.fuels} />
        <FilterSelect name="gearbox" label="Boîte de vitesses" value={values.gearbox} options={filters.gearboxes} />
        <fieldset>
          <legend className="text-sm font-medium">Prix</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input aria-label="Prix minimum" name="minPrice" type="number" min="0" defaultValue={values.minPrice} placeholder="Minimum" className="min-w-0 rounded-[var(--live-control-radius)] border border-[var(--live-border)] bg-[var(--live-background)] px-3 py-2" />
            <input aria-label="Prix maximum" name="maxPrice" type="number" min="0" defaultValue={values.maxPrice} placeholder="Maximum" className="min-w-0 rounded-[var(--live-control-radius)] border border-[var(--live-border)] bg-[var(--live-background)] px-3 py-2" />
          </div>
        </fieldset>
        {values.sort !== "recommended" && <input type="hidden" name="sort" value={values.sort} />}
        <button type="submit" className="min-h-11 w-full rounded-[var(--live-control-radius)] bg-[var(--live-primary)] px-4 font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)]">Appliquer</button>
        <Link href={filters.resetHref} className="block text-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)]">Réinitialiser</Link>
      </form>
    </details>
  )
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: LiveVehicleCatalog["filters"]["brands"] }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select name={name} defaultValue={value ?? ""} className="mt-2 min-h-11 w-full rounded-[var(--live-control-radius)] border border-[var(--live-border)] bg-[var(--live-background)] px-3">
        <option value="">Toutes</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.count})</option>)}
      </select>
    </label>
  )
}
