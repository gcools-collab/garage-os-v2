import type { LiveVehicleDetail } from "../../types"
import { LiveBadge, PriceDisplay } from "../ui"
import { liveVehicleStatusLabels } from "./vehicle-detail-presentation"

export function VehicleDetailHero({
  detail,
}: {
  detail: LiveVehicleDetail
}) {
  return (
    <header className="grid gap-8 border-b border-[var(--live-border)] pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <LiveBadge>{liveVehicleStatusLabels[detail.status]}</LiveBadge>
        <h1 className="mt-5 text-4xl font-[var(--live-heading-weight)] tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
          {detail.displayName}
        </h1>
        {detail.vehicle.year && (
          <p className="mt-3 text-lg text-[var(--live-muted-foreground)]">
            Millésime {detail.vehicle.year}
          </p>
        )}
        {detail.subtitle && (
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--live-muted-foreground)]">
            {detail.subtitle}
          </p>
        )}
      </div>
      <div className="lg:text-right">
        <p className="mb-2 text-sm text-[var(--live-muted-foreground)]">
          Prix affiché
        </p>
        <PriceDisplay price={detail.price ?? undefined} />
      </div>
    </header>
  )
}
