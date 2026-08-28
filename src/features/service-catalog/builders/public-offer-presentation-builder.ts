import type { PublicServiceOffer } from "../repositories/public-service-catalog-repository"
import {
  resolveSapOfferDurationMinutes,
  SAP_ENGINE_CLEANING_OFFER_OVERRIDES,
  SAP_SHOCK_OPTION_BY_OFFER_SLUG,
} from "../config/sap-engine-cleaning-catalog"

const money = (value: number | null, currency: string) =>
  value === null ? null : new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value / 100)

function formatDuration(minutes: number | null): string | null {
  if (minutes === null) return null
  if (minutes % 60 === 0 && minutes >= 60) {
    const hours = minutes / 60
    return hours === 1 ? "1h" : `${hours}h`
  }
  return `${minutes} min`
}

export type PublicOfferOptionPresentation = Readonly<{
  readonly id: string
  readonly offerId: string
  readonly code: string
  readonly name: string
  readonly supplementLabel: string
  readonly amountCents: number
  readonly durationDeltaMinutes: 0
}>

export type PublicOfferPresentation = Readonly<{
  readonly id: string
  readonly slug: string
  readonly shortLabel: string
  readonly selectLabel: string
  readonly priceLabel: string
  readonly durationLabel: string | null
  readonly durationMinutes: number
  readonly depositLabel: string | null
  readonly paymentHint: string | null
  readonly description: string | null
  readonly amountCents: number | null
  readonly currency: string
  readonly options: readonly PublicOfferOptionPresentation[]
}>

export type PublicServiceOfferOptionRecord = Readonly<{
  readonly id: string
  readonly offerId: string
  readonly name: string
  readonly amountCents: number | null
  readonly durationDeltaMinutes: number
}>

function shortLabelForOffer(offer: PublicServiceOffer): string {
  return SAP_ENGINE_CLEANING_OFFER_OVERRIDES[offer.slug]?.shortLabel ?? offer.name
}

function paymentHint(offer: PublicServiceOffer): string | null {
  if (offer.paymentStrategy === "DEPOSIT") {
    return "Le montant final dépend de la démarche."
  }
  if (offer.paymentStrategy === "FULL_PAYMENT") {
    return "Paiement en ligne pour confirmer le rendez-vous."
  }
  return null
}

function depositLabel(offer: PublicServiceOffer): string | null {
  if (offer.paymentStrategy !== "DEPOSIT" || offer.depositAmountCents === null) return null
  return `Acompte aujourd'hui : ${money(offer.depositAmountCents, offer.currency)}`
}

function buildOptionPresentations(
  offer: PublicServiceOffer,
  options: readonly PublicServiceOfferOptionRecord[],
): readonly PublicOfferOptionPresentation[] {
  const persisted = options
    .filter((option) => option.offerId === offer.id)
    .map((option) => ({
      id: option.id,
      offerId: option.offerId,
      code: option.name,
      name: option.name,
      supplementLabel: `+${money(option.amountCents, offer.currency)}`,
      amountCents: option.amountCents ?? 0,
      durationDeltaMinutes: 0 as const,
    }))

  if (persisted.length) return persisted

  const fallback = SAP_SHOCK_OPTION_BY_OFFER_SLUG[offer.slug]
  if (!fallback) return []
  return [{
    id: `config:${offer.slug}:${fallback.code}`,
    offerId: offer.id,
    code: fallback.code,
    name: fallback.name,
    supplementLabel: `+${money(fallback.amountCents, offer.currency)}`,
    amountCents: fallback.amountCents,
    durationDeltaMinutes: 0,
  }]
}

export function buildPublicOfferPresentations(
  offers: readonly PublicServiceOffer[],
  options: readonly PublicServiceOfferOptionRecord[] = [],
): readonly PublicOfferPresentation[] {
  return offers.map((offer) => {
    const durationMinutes = resolveSapOfferDurationMinutes(offer.slug, offer.durationMinutes)
    const priceLabel = offer.pricingType === "QUOTE"
      ? "Sur devis"
      : money(offer.amountCents, offer.currency) ?? "À déterminer"
    const shortLabel = shortLabelForOffer(offer)
    return {
      id: offer.id,
      slug: offer.slug,
      shortLabel,
      selectLabel: offer.pricingType === "QUOTE" || offer.amountCents === null
      ? shortLabel
      : `${shortLabel} — ${priceLabel}`,
      priceLabel,
      durationLabel: formatDuration(durationMinutes),
      durationMinutes,
      depositLabel: depositLabel(offer),
      paymentHint: paymentHint(offer),
      description: offer.description,
      amountCents: offer.amountCents,
      currency: offer.currency,
      options: buildOptionPresentations(offer, options),
    }
  })
}

export function resolveSelectedOfferTotal(input: {
  readonly offer: PublicOfferPresentation
  readonly selectedOptionIds: readonly string[]
}): number | null {
  if (input.offer.amountCents === null) return null
  const selected = input.offer.options.filter((option) => input.selectedOptionIds.includes(option.id))
  return input.offer.amountCents + selected.reduce((total, option) => total + option.amountCents, 0)
}
