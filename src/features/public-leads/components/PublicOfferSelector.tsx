"use client"

import { useMemo, useState } from "react"
import type { PublicOfferPresentation } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import { resolveSelectedOfferTotal } from "@/features/service-catalog/builders/public-offer-presentation-builder"

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value / 100)

export function PublicOfferSelector({
  offers,
  name = "offerSlug",
  onOfferChange,
}: {
  readonly offers: readonly PublicOfferPresentation[]
  readonly name?: string
  readonly onOfferChange?: (slug: string) => void
}) {
  const [selectedSlug, setSelectedSlug] = useState(offers[0]?.slug ?? "")
  const [selectedOptions, setSelectedOptions] = useState<readonly string[]>([])

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.slug === selectedSlug) ?? offers[0] ?? null,
    [offers, selectedSlug],
  )

  const shockOption = selectedOffer?.options[0] ?? null
  const totalCents = selectedOffer
    ? resolveSelectedOfferTotal({ offer: selectedOffer, selectedOptionIds: selectedOptions })
    : null

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

      {shockOption ? (
        <label className="flex gap-3 rounded-xl border border-[var(--live-border)] p-4 text-sm">
          <input
            type="checkbox"
            name="offerOptionIds"
            value={shockOption.id}
            checked={selectedOptions.includes(shockOption.id)}
            onChange={(event) => {
              setSelectedOptions(event.target.checked ? [shockOption.id] : [])
            }}
            className="mt-1 size-4"
          />
          <span>
            <span className="font-medium">Ajouter {shockOption.name}</span>
            <span className="mt-1 block text-[var(--live-muted-foreground)]">{shockOption.supplementLabel}</span>
            <span className="mt-1 block text-xs text-[var(--live-muted-foreground)]">La durée du rendez-vous reste celle de la prestation de base.</span>
          </span>
        </label>
      ) : null}

      {totalCents !== null && selectedOptions.length > 0 ? (
        <div className="rounded-xl border border-[var(--live-border)] p-4 text-sm">
          <div className="flex justify-between gap-4"><span>{selectedOffer.shortLabel}</span><span>{selectedOffer.priceLabel}</span></div>
          {shockOption ? <div className="mt-2 flex justify-between gap-4 text-[var(--live-muted-foreground)]"><span>{shockOption.name}</span><span>{shockOption.supplementLabel}</span></div> : null}
          <div className="mt-3 flex justify-between gap-4 border-t border-[var(--live-border)] pt-3 font-semibold"><span>Total</span><span>{money(totalCents, selectedOffer.currency)}</span></div>
        </div>
      ) : null}
    </div>
  )
}

export function readOfferSelection(form: HTMLFormElement) {
  const slug = form.elements.namedItem("offerSlug")
  const option = form.elements.namedItem("offerOptionIds")
  return {
    offerSlug: slug instanceof HTMLSelectElement ? slug.value : "",
    offerOptionIds: option instanceof HTMLInputElement && option.checked ? [option.value] : [],
  }
}
