import type { PublicOfferPresentation } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import { resolveSelectedOfferTotal } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import { fullDayLabel } from "@/features/scheduling/utils/public-slot-picker-utils"
import type { AvailabilitySlot } from "@/features/scheduling/types/scheduling"

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value / 100)

export function PublicAppointmentSummary({
  slot,
  offer,
  selectedOptionIds,
}: {
  readonly slot: AvailabilitySlot
  readonly offer: PublicOfferPresentation
  readonly selectedOptionIds: readonly string[]
}) {
  const totalCents = resolveSelectedOfferTotal({ offer, selectedOptionIds })
  const selectedOptions = offer.options.filter((option) => selectedOptionIds.includes(option.id))
  const paymentLine = offer.depositLabel
    ? offer.depositLabel
    : totalCents !== null
      ? `${money(totalCents, offer.currency)} à régler en ligne`
      : null

  return (
    <aside
      aria-label="Récapitulatif du rendez-vous"
      className="rounded-xl border border-[var(--live-border)] bg-[var(--live-surface-muted)] p-4 text-sm"
    >
      <h3 className="font-semibold">Votre rendez-vous</h3>
      <p className="mt-2">
        {fullDayLabel(slot.startsAt)} à {slot.timeLabel}
        {offer.durationLabel ? ` · Durée ${offer.durationLabel}` : null}
      </p>
      <p className="mt-3 font-medium">{offer.shortLabel}</p>
      {selectedOptions.map((option) => (
        <p key={option.id} className="mt-1 text-[var(--live-muted-foreground)]">{option.name}</p>
      ))}
      {paymentLine ? <p className="mt-3 font-semibold text-[var(--live-primary)]">{paymentLine}</p> : null}
    </aside>
  )
}
