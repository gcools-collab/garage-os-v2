"use client"

import Image from "next/image"
import { useActionState, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import type { PublicRequestFormViewModel, PublicRequestSource, PublicRequestState, PublicVehicleContextViewModel } from "../types"
import { submitPublicCustomerRequest } from "../actions"
import type { AvailabilitySlot } from "@/features/scheduling/types/scheduling"
import { PublicSlotSelector } from "@/features/scheduling/components/PublicSlotSelector"

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

export function PublicRequestForm({ form, garageSlug, vehicleSlug, vehicleContext, source, publicPageUrl, availability = [] }: {
  readonly form: PublicRequestFormViewModel
  readonly garageSlug: string
  readonly vehicleSlug: string | null
  readonly vehicleContext?: PublicVehicleContextViewModel | null
  readonly source: PublicRequestSource
  readonly publicPageUrl: string
  readonly availability?: readonly AvailabilitySlot[]
}) {
  const [startedAt] = useState(() => Date.now())
  const [state, action] = useActionState(submitPublicCustomerRequest, initial)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state.status === "validation_error") formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus() }, [state.status])
  if (state.status === "success") return <section aria-live="polite" className="rounded-2xl border border-[var(--live-border)] p-6"><h2 className="text-2xl font-semibold">Demande transmise</h2><p className="mt-3">{state.message}</p>{state.reference ? <p className="mt-3 font-medium">Référence {state.reference}</p> : null}</section>
  return <section id="request-form" className="rounded-2xl border border-[var(--live-border)] p-5 sm:p-7">
    <h2 className="text-2xl font-semibold">{form.title}</h2><p className="mt-2 text-[var(--live-muted-foreground)]">{form.description}</p>
    {vehicleContext && form.contextHeading ? <VehicleContext heading={form.contextHeading} vehicle={vehicleContext} /> : null}
    {form.steps.length > 1 ? <ol aria-label="Progression du formulaire" className="mt-6 flex flex-wrap gap-3 text-xs text-[var(--live-muted-foreground)]">{form.steps.map((step, index) => <li key={step.id} className="flex items-center gap-2"><span aria-hidden className="grid size-6 place-items-center rounded-full border border-[var(--live-border)] font-semibold">{index + 1}</span>{step.title}</li>)}</ol> : null}
    <form ref={formRef} action={action} className="mt-6 space-y-7">
      <input type="hidden" name="garageSlug" value={garageSlug}/><input type="hidden" name="vehicleSlug" value={vehicleSlug ?? ""}/><input type="hidden" name="requestType" value={form.type}/><input type="hidden" name="source" value={source}/><input type="hidden" name="publicPageUrl" value={publicPageUrl}/><input type="hidden" name="formStartedAt" value={startedAt}/><label className="sr-only" aria-hidden>Site internet<input name="website" tabIndex={-1} autoComplete="off"/></label>
      {form.steps.map((step, index) => <fieldset key={step.id} className="grid gap-5 border-0 p-0 sm:grid-cols-2"><legend className="mb-4 w-full text-lg font-semibold"><span className="sr-only">Étape {index + 1} sur {form.steps.length} : </span>{step.title}</legend>{form.fields.filter((item) => item.step === step.id).map((item) => { const hasError = Boolean(state.fieldErrors?.[item.name]?.length); return <label key={item.name} className={`grid gap-2 text-sm font-medium ${item.type === "textarea" ? "sm:col-span-2" : ""}`}>{item.label}{item.type === "textarea" ? <textarea name={item.name} required={item.required} rows={4} className={`${control} py-3`} aria-invalid={hasError} aria-describedby={`${item.name}-error`}/> : item.type === "select" ? <select name={item.name} required={item.required} className={control} aria-invalid={hasError} aria-describedby={`${item.name}-error`}><option value="">Sélectionner</option>{item.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input name={item.name} type={item.type} required={item.required} className={control} aria-invalid={hasError} aria-describedby={`${item.name}-error`}/>} {item.hint ? <span className="text-xs text-[var(--live-muted-foreground)]">{item.hint}</span> : null}{hasError ? <span id={`${item.name}-error`} className="text-sm text-[var(--live-danger)]">{state.fieldErrors?.[item.name]?.join(" ")}</span> : null}</label>})}</fieldset>)}
      {availability.length ? <PublicSlotSelector slots={availability} /> : null}
      <div className="grid gap-4 border-t border-[var(--live-border)] pt-5"><label className="flex gap-3 text-sm"><input type="checkbox" name="consentContact" required className="mt-1 size-4"/>J’accepte d’être contacté à propos de cette demande.</label><label className="flex gap-3 text-sm"><input type="checkbox" name="consentMarketing" className="mt-1 size-4"/>J’accepte de recevoir des offres commerciales.</label><p aria-live="assertive" className="min-h-5 text-sm text-[var(--live-danger)]">{state.status !== "idle" ? state.message : ""}</p><Submit label={form.submitLabel}/></div>
    </form>
  </section>
}
