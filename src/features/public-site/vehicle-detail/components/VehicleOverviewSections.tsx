import type { VehicleDetailPageViewModel } from "../presentation"
import { VehicleSection } from "./VehicleSection"

export function VehicleOverviewSections({
  detail,
}: {
  readonly detail: VehicleDetailPageViewModel
}) {
  return (
    <>
      <VehicleSection id="commercial-summary" title="L’essentiel" description="Les points clés pour comprendre ce véhicule.">
        <ul className="grid gap-3 sm:grid-cols-2">{detail.commercialSummary.map((item) => <li key={item} className="rounded-xl bg-[var(--live-surface-muted)] p-4 font-medium">{item}</li>)}</ul>
      </VehicleSection>
      <VehicleSection id="vehicle-price" title="Prix">
        <p className="text-4xl font-semibold">{detail.pricing.mainPrice}</p>
        {detail.pricing.vatLabel ? <p className="mt-2 text-sm">{detail.pricing.vatLabel}</p> : null}
      </VehicleSection>
      <VehicleSection id="vehicle-specifications" title="Caractéristiques">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">{detail.specifications.map((item) => <div key={item.label} className="border-b border-[var(--live-border)] pb-3"><dt className="text-sm text-[var(--live-muted-foreground)]">{item.label}</dt><dd className="mt-1 font-medium">{item.value}</dd></div>)}</dl>
      </VehicleSection>
      {detail.description.sellerDescription ? <VehicleSection id="vehicle-description" title="Description"><p className="whitespace-pre-line leading-7">{detail.description.sellerDescription}</p></VehicleSection> : null}
      {detail.equipmentGroups.length ? <VehicleSection id="vehicle-equipment" title="Équipements"><div className="grid gap-6 sm:grid-cols-2">{detail.equipmentGroups.map((group) => <div key={group.id}><h3 className="font-semibold">{group.title}</h3><ul className="mt-3 space-y-2 text-sm text-[var(--live-muted-foreground)]">{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div></VehicleSection> : null}
      {detail.history.length ? <VehicleSection id="vehicle-history" title="Historique"><ol className="space-y-4">{detail.history.map((item) => <li key={`${item.date}:${item.label}`} className="grid gap-1 sm:grid-cols-[10rem_1fr]"><time className="text-sm text-[var(--live-muted-foreground)]">{item.date}</time><span>{item.label}</span></li>)}</ol></VehicleSection> : null}
    </>
  )
}
