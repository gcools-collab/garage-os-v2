import Link from "next/link"
import type { LiveVehicleCatalog } from "../../types"

export function VehicleCatalogPagination({ pagination }: { pagination: LiveVehicleCatalog["pagination"] }) {
  if (pagination.totalPages <= 1) return null
  return (
    <nav aria-label="Pagination du catalogue" className="flex items-center justify-center gap-4">
      {pagination.previousHref ? <Link href={pagination.previousHref} className="rounded-[var(--live-control-radius)] border border-[var(--live-border)] px-4 py-2">Précédent</Link> : <span />}
      <span>Page {pagination.page} sur {pagination.totalPages}</span>
      {pagination.nextHref ? <Link href={pagination.nextHref} className="rounded-[var(--live-control-radius)] border border-[var(--live-border)] px-4 py-2">Suivant</Link> : <span />}
    </nav>
  )
}
