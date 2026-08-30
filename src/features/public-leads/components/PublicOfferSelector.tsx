"use client"

import { useMemo, useState } from "react"
import type { PublicOfferPresentation } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import { resolveSelectedOfferTotal } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import { SAP_ENGINE_CLEANING_OFFER_OVERRIDES } from "@/features/service-catalog/config/sap-engine-cleaning-catalog"

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value / 100)

export function PublicOfferSelector({
  offers,
  name = "offerSlug",
  onOfferChange,
  onOptionChange,
}: {
  readonly offers: readonly PublicOfferPresentation[]
  readonly name?: string
  readonly onOfferChange?: (slug: string) => void
  readonly onOptionChange?: (optionIds: readonly string[]) => void
}) {
  const [selectedSlug, setSelectedSlug] = useState(offers[0]?.slug ?? "")
  const [selectedOptions, setSelectedOptions] = useState<readonly string[]>([])

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.slug === selectedSlug) ?? offers[0] ?? null,
    [offers, selectedSlug],
  )

  const totalCents = selectedOffer
    ? resolveSelectedOfferTotal({ offer: selectedOffer, selectedOptionIds: selectedOptions })
    : null
  const engineCleaning = Boolean(selectedOffer && SAP_ENGINE_CLEANING_OFFER_OVERRIDES[selectedOffer.slug])
  const selectedOptionRecords = selectedOffer?.options.filter((option) => selectedOptions.includes(option.id)) ?? []

  if (!selectedOffer) return null

  return (
    <div className="grid gap-4 sm:col-span-2">
      <label className="grid gap-2 text-sm font-medium">
        Prestation
        <select
          name={name}
          required
          value={selectedSlug}
          onChange={(event) => {
            setSelectedSlug(event.target.value)
            setSelectedOptions([])
            onOfferChange?.(event.target.value)
            onOptionChange?.([])
          }}
          className="min-h-11 w-full rounded-lg border border-[var(--live-border)] bg-[var(--live-background)] px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
        >
          {offers.map((offer) => (
            <option key={offer.slug} value={offer.slug}>{offer.selectLabel}</option>
          ))}
        </select>
      </label>

      <div className="rounded-xl border border-[var(--live-border)] bg-[var(--live-surface-muted)] p-4 text-sm">
        <p className="font-semibold">{selectedOffer.shortLabel}</p>
        <p className="mt-1 text-[var(--live-primary)]">{selectedOffer.priceLabel}</p>
        {selectedOffer.durationLabel ? <p className="mt-2 text-[var(--live-muted-foreground)]">Durée : {selectedOffer.durationLabel}</p> : null}
        {selectedOffer.depositLabel ? <p className="mt-2">{selectedOffer.depositLabel}</p> : null}
        {selectedOffer.paymentHint ? <p className="mt-1 text-[var(--live-muted-foreground)]">{selectedOffer.paymentHint}</p> : null}
        {selectedOffer.description ? <p className="mt-2 text-[var(--live-muted-foreground)]">{selectedOffer.description}</p> : null}
      </div>

      {selectedOffer.options.map((option) => (
        <label key={option.id} className="flex gap-3 rounded-xl border border-[var(--live-border)] p-4 text-sm">
          <input
            type="checkbox"
            name="offerOptionIds"
            value={option.id}
            checked={selectedOptions.includes(option.id)}
            onChange={(event) => {
              const next = event.target.checked
                ? [...selectedOptions, option.id]
                : selectedOptions.filter((id) => id !== option.id)
              setSelectedOptions(next)
              onOptionChange?.(next)
            }}
            className="mt-1 size-4"
          />
          <span>
            <span className="font-medium">Ajouter {option.name}</span>
            <span className="mt-1 block text-[var(--live-muted-foreground)]">{option.supplementLabel}</span>
            {option.code.startsWith("SHOCK") || /choc|double machine/i.test(option.name) ? (
              <span className="mt-1 block text-xs text-[var(--live-muted-foreground)]">
                +19,90 € jusqu’à 1,9 L · +29,90 € à partir de 2 L. La durée du rendez-vous reste celle de la prestation de base.
              </span>
            ) : null}
          </span>
        </label>
      ))}

      {engineCleaning ? (
        <p className="text-xs leading-5 text-[var(--live-muted-foreground)]">
          Le décalaminage ne répare pas une panne mécanique et ne débouche pas un FAP défectueux.
        </p>
      ) : null}

      {totalCents !== null && selectedOptions.length > 0 ? (
        <div className="rounded-xl border border-[var(--live-border)] p-4 text-sm">
          <div className="flex justify-between gap-4"><span>{selectedOffer.shortLabel}</span><span>{selectedOffer.priceLabel}</span></div>
          {selectedOptionRecords.map((option) => (
            <div key={option.id} className="mt-2 flex justify-between gap-4 text-[var(--live-muted-foreground)]">
              <span>{option.name}</span>
              <span>{option.supplementLabel}</span>
            </div>
          ))}
          <div className="mt-3 flex justify-between gap-4 border-t border-[var(--live-border)] pt-3 font-semibold"><span>Total</span><span>{money(totalCents, selectedOffer.currency)}</span></div>
        </div>
      ) : null}
    </div>
  )
}

export function readOfferSelection(form: HTMLFormElement) {
  const slug = form.elements.namedItem("offerSlug")
  const options = form.querySelectorAll<HTMLInputElement>('input[name="offerOptionIds"]')
  return {
    offerSlug: slug instanceof HTMLSelectElement ? slug.value : "",
    offerOptionIds: [...options].filter((option) => option.checked).map((option) => option.value),
  }
}
