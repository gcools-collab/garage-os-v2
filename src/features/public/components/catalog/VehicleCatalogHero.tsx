import type { LiveVehicleCatalog } from "../../types"

export function VehicleCatalogHero({ catalog }: { catalog: LiveVehicleCatalog }) {
  return (
    <header className="border-b border-[var(--live-border)] pb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--live-muted-foreground)]">
        {catalog.heading.eyebrow}
      </p>
      <h1 className="mt-4 text-4xl font-[var(--live-heading-weight)] tracking-[-0.04em] sm:text-5xl">
        {catalog.heading.title}
      </h1>
      <p className="mt-5 max-w-2xl leading-7 text-[var(--live-muted-foreground)]">
        {catalog.heading.description}
      </p>
      <p className="mt-4 text-sm font-semibold">
        {catalog.resultCount} véhicule{catalog.resultCount > 1 ? "s" : ""} disponible{catalog.resultCount > 1 ? "s" : ""}
      </p>
    </header>
  )
}
