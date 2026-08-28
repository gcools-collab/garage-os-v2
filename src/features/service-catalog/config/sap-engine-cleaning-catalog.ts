/**
 * SAP commercial rules for public decarbonization (display + scheduling).
 * Shock option duration intentionally inherits the selected base service duration.
 */
export const SAP_ENGINE_CLEANING_OFFER_OVERRIDES: Readonly<
  Record<string, Readonly<{ readonly durationMinutes: number; readonly shortLabel: string }>>
> = {
  "engine-cleaning-under-2l": {
    durationMinutes: 60,
    shortLabel: "Décalaminage moteur < 2L",
  },
  "engine-cleaning-2l-plus": {
    durationMinutes: 90,
    shortLabel: "Décalaminage moteur >= 2L",
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
    name: "Traitement choc double machine",
    amountCents: 2990,
  },
}

export function resolveSapOfferDurationMinutes(slug: string, fallback: number | null): number {
  return SAP_ENGINE_CLEANING_OFFER_OVERRIDES[slug]?.durationMinutes ?? fallback ?? 60
}
