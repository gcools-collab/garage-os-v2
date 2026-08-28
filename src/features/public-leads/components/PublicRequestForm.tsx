"use client"

import Image from "next/image"
import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import type { PublicOfferPresentation } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import type { PublicRequestFormViewModel, PublicRequestSource, PublicRequestState, PublicVehicleContextViewModel } from "../types"
import { submitPublicCustomerRequest } from "../actions"
import type { AvailabilitySlot } from "@/features/scheduling/types/scheduling"
import { PublicSlotSelector } from "@/features/scheduling/components/PublicSlotSelector"
import { PublicOfferSelector } from "./PublicOfferSelector"
import { PublicAppointmentSummary } from "./PublicAppointmentSummary"

const initial: PublicRequestState = { status: "idle", message: "" }
const control = "min-h-11 w-full rounded-lg border border-[var(--live-border)] bg-[var(--live-background)] px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"

function Submit({ label }: { readonly label: string }) {
  const { pending } = useFormStatus()
  return <button disabled={pending} className="min-h-12 w-full rounded-lg bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)] disabled:opacity-60 sm:w-auto">{pending ? "Envoi en cours…" : label}</button>
}

function VehicleContext({ heading, vehicle }: { readonly heading: string; readonly vehicle: PublicVehicleContextViewModel }) {
  return <aside aria-label="Véhicule concerné" className="mt-5 flex gap-4 rounded-xl border border-[var(--live-border)] bg-[var(--live-surface-muted)] p-3">
    <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-[var(--live-muted)]">
      {vehicle.imageUrl ? <Image src={vehicle.imageUrl} alt={vehicle.imageAlt} fill sizes="96px" className="object-cover" /> : null}
    </div>
    <div className="min-w-0 self-center"><p className="text-xs text-[var(--live-muted-foreground)]">{heading}</p><p className="mt-1 truncate font-semibold">{vehicle.title}</p>{vehicle.subtitle ? <p className="truncate text-sm">{vehicle.subtitle}</p> : null}<p className="mt-1 text-sm text-[var(--live-muted-foreground)]">{vehicle.metadata}</p><p className="mt-1 font-semibold">{vehicle.price}</p></div>
  </aside>
}

function filterSlotsByDuration(slots: readonly AvailabilitySlot[], durationMinutes: number): readonly AvailabilitySlot[] {
  if (durationMinutes <= 60) return slots
  return slots.filter((slot) => {
    const start = Date.parse(slot.startsAt)
    const end = start + durationMinutes * 60_000
    return !slots.some((other) => {
      if (other.dateLabel !== slot.dateLabel) return false
      const otherStart = Date.parse(other.startsAt)
      return otherStart > start && otherStart < end
    })
  }).map((slot) => ({
    ...slot,
    endsAt: new Date(Date.parse(slot.startsAt) + durationMinutes * 60_000).toISOString(),
  }))
}

export function PublicRequestForm({
  form,
  garageSlug,
  vehicleSlug,
  vehicleContext,
  source,
  publicPageUrl,
  availability = [],
  availabilityByOfferSlug,
  offers = [],
  compactFormHeading = false,
}: {
  readonly form: PublicRequestFormViewModel
  readonly garageSlug: string
  readonly vehicleSlug: string | null
  readonly vehicleContext?: PublicVehicleContextViewModel | null
  readonly source: PublicRequestSource
  readonly publicPageUrl: string
  readonly availability?: readonly AvailabilitySlot[]
  readonly availabilityByOfferSlug?: Readonly<Record<string, readonly AvailabilitySlot[]>>
  readonly offers?: readonly PublicOfferPresentation[]
  readonly compactFormHeading?: boolean
}) {
  const [startedAt] = useState(() => Date.now())
  const [selectedOfferSlug, setSelectedOfferSlug] = useState(offers[0]?.slug ?? "")
  const [selectedOptionIds, setSelectedOptionIds] = useState<readonly string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const [state, action] = useActionState(submitPublicCustomerRequest, initial)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => { if (state.status === "validation_error") formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus() }, [state.status])

  const selectedOffer = offers.find((offer) => offer.slug === selectedOfferSlug) ?? offers[0] ?? null
  const offerAvailability = selectedOfferSlug ? availabilityByOfferSlug?.[selectedOfferSlug] : undefined
  const baseAvailability = offerAvailability ?? availability
  const visibleSlots = useMemo(
    () => filterSlotsByDuration(baseAvailability, selectedOffer?.durationMinutes ?? 60),
    [baseAvailability, selectedOffer?.durationMinutes],
  )

  if (state.status === "success") return <section aria-live="polite" className="rounded-2xl border border-[var(--live-border)] p-6"><h2 className="text-2xl font-semibold">Demande transmise</h2><p className="mt-3">{state.message}</p>{state.reference ? <p className="mt-3 font-medium">Référence {state.reference}</p> : null}<div className="mt-5 flex flex-wrap gap-3">{state.registrationUrl?<a href={state.registrationUrl} className="inline-flex min-h-12 items-center rounded-lg bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)]">Accéder à mon dossier</a>:null}{state.paymentUrl?<a href={state.paymentUrl} className="inline-flex min-h-12 items-center rounded-lg border border-[var(--live-border)] px-6 font-semibold">Accéder au paiement sécurisé</a>:state.appointmentStatus==="AWAITING_PAYMENT"?<p className="text-sm text-[var(--live-muted-foreground)]">Le paiement en ligne est temporairement indisponible. Le garage vous recontactera.</p>:null}</div></section>

  const catalogFields = new Set(["offerSlug", "offerOptionIds"])
  const showStepProgress = form.steps.length > 1 && !compactFormHeading

  return <section id="request-form" className="rounded-2xl border border-[var(--live-border)] p-5 sm:p-7">
    {!compactFormHeading ? (
      <>
        <h2 className="text-2xl font-semibold">{form.title}</h2>
        <p className="mt-2 text-[var(--live-muted-foreground)]">{form.description}</p>
      </>
    ) : null}
    {vehicleContext && form.contextHeading ? <VehicleContext heading={form.contextHeading} vehicle={vehicleContext} /> : null}
    {showStepProgress ? <ol aria-label="Progression du formulaire" className="mt-6 flex flex-wrap gap-3 text-xs text-[var(--live-muted-foreground)]">{form.steps.map((step, index) => <li key={step.id} className="flex items-center gap-2"><span aria-hidden className="grid size-6 place-items-center rounded-full border border-[var(--live-border)] font-semibold">{index + 1}</span>{step.title}</li>)}</ol> : null}
    <form ref={formRef} action={action} className={compactFormHeading ? "mt-2 space-y-6" : "mt-6 space-y-7"}>
      <input type="hidden" name="garageSlug" value={garageSlug}/><input type="hidden" name="vehicleSlug" value={vehicleSlug ?? ""}/><input type="hidden" name="requestType" value={form.type}/><input type="hidden" name="source" value={source}/><input type="hidden" name="publicPageUrl" value={publicPageUrl}/><input type="hidden" name="formStartedAt" value={startedAt}/><label className="sr-only" aria-hidden>Site internet<input name="website" tabIndex={-1} autoComplete="off"/></label>
      {offers.length ? (
        <fieldset className="grid gap-5 border-0 p-0 sm:grid-cols-2">
          <legend className="mb-4 w-full text-lg font-semibold">Prestation</legend>
          <PublicOfferSelector
            offers={offers}
            onOfferChange={(slug) => {
              setSelectedOfferSlug(slug)
              setSelectedSlot(null)
            }}
            onOptionChange={setSelectedOptionIds}
          />
        </fieldset>
      ) : null}
      {form.steps.map((step, index) => (
        <fieldset key={step.id} className="grid gap-5 border-0 p-0 sm:grid-cols-2">
          <legend className="mb-4 w-full text-lg font-semibold"><span className="sr-only">Étape {index + 1} sur {form.steps.length} : </span>{step.title}</legend>
          {form.fields.filter((item) => item.step === step.id && !catalogFields.has(item.name)).map((item) => {
            const hasError = Boolean(state.fieldErrors?.[item.name]?.length)
            return <label key={item.name} className={`grid gap-2 text-sm font-medium ${item.type === "textarea" ? "sm:col-span-2" : ""}`}>{item.label}{item.type === "textarea" ? <textarea name={item.name} required={item.required} rows={4} placeholder={item.placeholder} className={`${control} py-3`} aria-invalid={hasError} aria-describedby={`${item.name}-error`}/> : item.type === "select" ? <select name={item.name} required={item.required} className={control} aria-invalid={hasError} aria-describedby={`${item.name}-error`}><option value="">Sélectionner</option>{item.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input name={item.name} type={item.type} required={item.required} placeholder={item.placeholder} className={control} aria-invalid={hasError} aria-describedby={`${item.name}-error`}/>} {item.hint ? <span className="text-xs text-[var(--live-muted-foreground)]">{item.hint}</span> : null}{hasError ? <span id={`${item.name}-error`} className="text-sm text-[var(--live-danger)]">{state.fieldErrors?.[item.name]?.join(" ")}</span> : null}</label>
          })}
        </fieldset>
      ))}
      {visibleSlots.length ? (
        <PublicSlotSelector
          key={`${selectedOfferSlug}-${visibleSlots[0]?.startsAt ?? "none"}-${visibleSlots.length}`}
          slots={visibleSlots}
          onSlotChange={setSelectedSlot}
        />
      ) : baseAvailability.length || availability.length ? (
        <p className="rounded-lg border p-4 text-sm text-[var(--live-muted-foreground)]">Aucun créneau compatible avec la durée de cette prestation.</p>
      ) : null}
      {selectedSlot && selectedOffer ? (
        <PublicAppointmentSummary
          slot={selectedSlot}
          offer={selectedOffer}
          selectedOptionIds={selectedOptionIds}
        />
      ) : null}
      <div className="grid gap-4 border-t border-[var(--live-border)] pt-5"><label className="flex gap-3 text-sm"><input type="checkbox" name="consentContact" required className="mt-1 size-4"/>J’accepte d’être contacté à propos de cette demande.</label><label className="flex gap-3 text-sm"><input type="checkbox" name="consentMarketing" className="mt-1 size-4"/>J’accepte de recevoir des offres commerciales.</label><p aria-live="assertive" className="min-h-5 text-sm text-[var(--live-danger)]">{state.status !== "idle" ? state.message : ""}</p><Submit label={form.submitLabel}/></div>
    </form>
  </section>
}
