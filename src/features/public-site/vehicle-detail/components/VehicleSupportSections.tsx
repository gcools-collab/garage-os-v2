import type { VehicleDetailPageViewModel } from "../presentation"
import { VehicleSection } from "./VehicleSection"

export function VehicleSupportSections({ detail }: { readonly detail: VehicleDetailPageViewModel }) {
  return (
    <>
      <VehicleSection id="vehicle-services" title="Services proposés">
        <div className="grid gap-4 sm:grid-cols-2">{detail.services.map((service) => <a key={service.id} href={service.href} className="rounded-xl border border-[var(--live-border)] p-4 focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]"><h3 className="font-semibold">{service.title}</h3><p className="mt-2 text-sm text-[var(--live-muted-foreground)]">{service.description}</p></a>)}</div>
      </VehicleSection>
      <VehicleSection id="vehicle-trust" title={detail.trust.title}>
        <div className="grid gap-4 sm:grid-cols-2">{detail.trust.items.map((item) => <article key={item.id} className="rounded-xl bg-[var(--live-surface-muted)] p-4"><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm text-[var(--live-muted-foreground)]">{item.description}</p></article>)}</div>
      </VehicleSection>
      <VehicleSection id="vehicle-location" title="Localisation">
        <div className="grid gap-6 sm:grid-cols-2"><div><p className="text-xl font-semibold">{detail.location.garageName}</p><p className="mt-2 text-[var(--live-muted-foreground)]">{detail.location.address}</p><p className="mt-4 text-sm">{detail.location.distanceLabel}</p>{detail.location.openingHours.map((hours) => <p key={hours} className="mt-1 text-sm">{hours}</p>)}</div><div className="flex aspect-video items-center justify-center rounded-xl bg-[var(--live-surface-muted)] text-sm text-[var(--live-muted-foreground)]">Google Maps — {detail.location.mapLabel}</div></div>
      </VehicleSection>
    </>
  )
}
