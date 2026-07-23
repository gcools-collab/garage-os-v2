import type { LiveVehicleDetail } from "../../types"
import { PriceDisplay } from "../ui"
import { liveVehicleStatusLabels } from "./vehicle-detail-presentation"

export function VehicleSummary({
  detail,
}: {
  detail: LiveVehicleDetail
}) {
  return (
    <section
      aria-labelledby="vehicle-summary-title"
      className="rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] p-5 sm:p-6"
    >
      <h2 id="vehicle-summary-title" className="text-xl font-semibold">
        Informations principales
      </h2>
      <dl className="mt-6 divide-y divide-[var(--live-border)]">
        {detail.metadata.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-5 py-3 first:pt-0">
            <dt className="text-sm text-[var(--live-muted-foreground)]">
              {item.label}
            </dt>
            <dd className="text-right text-sm font-medium">{item.value}</dd>
          </div>
        ))}
        <div className="flex items-start justify-between gap-5 py-3">
          <dt className="text-sm text-[var(--live-muted-foreground)]">Statut</dt>
          <dd className="text-right text-sm font-medium">
            {liveVehicleStatusLabels[detail.status]}
          </dd>
        </div>
      </dl>
      <div className="mt-6 border-t border-[var(--live-border)] pt-5">
        <p className="mb-2 text-sm text-[var(--live-muted-foreground)]">Prix</p>
        <PriceDisplay price={detail.price ?? undefined} />
      </div>
    </section>
  )
}
