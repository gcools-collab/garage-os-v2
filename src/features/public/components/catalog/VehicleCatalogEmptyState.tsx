import Link from "next/link"
import type { LiveVehicleCatalog } from "../../types"

export function VehicleCatalogEmptyState({ state }: { state: NonNullable<LiveVehicleCatalog["emptyState"]> }) {
  return (
    <section aria-live="polite" className="rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] p-8 text-center sm:p-12">
      <h2 className="text-2xl font-semibold">{state.title}</h2>
      <p className="mt-3 text-[var(--live-muted-foreground)]">{state.description}</p>
      {state.resetHref && <Link href={state.resetHref} className="mt-6 inline-flex min-h-11 items-center rounded-[var(--live-control-radius)] bg-[var(--live-primary)] px-5 font-semibold text-[var(--live-primary-foreground)]">Voir tous les véhicules</Link>}
    </section>
  )
}
