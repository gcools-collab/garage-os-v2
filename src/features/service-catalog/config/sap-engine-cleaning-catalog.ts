/**
 * SAP commercial rules for public decarbonization (display + scheduling).
 * Shock option duration intentionally inherits the selected base service duration.
 */
export const SAP_ENGINE_CLEANING_OFFER_OVERRIDES: Readonly<
  Record<string, Readonly<{ readonly durationMinutes: number; readonly shortLabel: string }>>
> = {
  "engine-cleaning-under-2l": {
    durationMinutes: 60,
    shortLabel: "Décalaminage jusqu’à 1,9 L",
  },
  "engine-cleaning-2l-plus": {
    durationMinutes: 90,
    shortLabel: "Décalaminage 2 L et plus",
  },
}

export const SAP_SHOCK_OPTION_BY_OFFER_SLUG: Readonly<
  Record<string, Readonly<{ readonly code: string; readonly name: string; readonly amountCents: number }>>
> = {
  "engine-cleaning-under-2l": {
    code: "SHOCK_UNDER_2L",
    name: "Traitement choc double machine",
    amountCents: 1990,
  },
  "engine-cleaning-2l-plus": {
    code: "SHOCK_2L_PLUS",
    name: "Traitement choc double machine 2 L et plus",
    amountCents: 2990,
  },
}

export const SAP_ELECTRONIC_DIAGNOSTIC_OPTION = {
  code: "ELECTRONIC_DIAGNOSTIC",
  name: "Diagnostic électronique avec rapport",
  amountCents: 3000,
} as const

export const SAP_ENGINE_CLEANING_FALLBACK_OFFERS = [
  {
    id: "fallback-engine-cleaning-under-2l",
    serviceKey: "ENGINE_CLEANING",
    name: "Décalaminage jusqu’à 1,9 L",
    slug: "engine-cleaning-under-2l",
    description: null,
    durationMinutes: 60,
    pricingType: "FIXED",
    amountCents: 3990,
    currency: "EUR",
    paymentStrategy: "FULL_PAYMENT",
    depositAmountCents: null,
  },
  {
    id: "fallback-engine-cleaning-2l-plus",
    serviceKey: "ENGINE_CLEANING",
    name: "Décalaminage 2 L et plus",
    slug: "engine-cleaning-2l-plus",
    description: null,
    durationMinutes: 90,
    pricingType: "FIXED",
    amountCents: 4990,
    currency: "EUR",
    paymentStrategy: "FULL_PAYMENT",
    depositAmountCents: null,
  },
] as const

export function resolveSapOfferDurationMinutes(slug: string, fallback: number | null): number {
  return SAP_ENGINE_CLEANING_OFFER_OVERRIDES[slug]?.durationMinutes ?? fallback ?? 60
}
