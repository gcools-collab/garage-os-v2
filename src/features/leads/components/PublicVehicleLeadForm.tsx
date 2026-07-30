"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"

import { submitPublicVehicleLead } from "../actions"
import { PUBLIC_VEHICLE_LEAD_TYPES } from "../presentation"
import { initialPublicLeadState } from "../state"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-[var(--live-control-radius)] bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)] transition hover:bg-[var(--live-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Envoi en cours…" : "Transmettre ma demande"}
    </button>
  )
}

function FieldError({
  name,
  errors,
}: {
  readonly name: string
  readonly errors?: Readonly<Record<string, readonly string[]>>
}) {
  const messages = errors?.[name]
  return messages?.length
    ? <span id={`${name}-error`} className="text-sm text-[var(--live-danger)]">{messages.join(" ")}</span>
    : null
}

export function PublicVehicleLeadForm({
  garageSlug,
  vehicleSlug,
  vehicleTitle,
  publicPageUrl,
}: {
  readonly garageSlug: string
  readonly vehicleSlug: string
  readonly vehicleTitle: string
  readonly publicPageUrl: string
}) {
  const [formStartedAt] = useState(() => Date.now())
  const [state, action] = useActionState(submitPublicVehicleLead, initialPublicLeadState)
  if (state.status === "success") {
    return (
      <section id="vehicle-inquiry" aria-live="polite" className="rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Demande transmise</h2>
        <p className="mt-3 text-[var(--live-muted-foreground)]">{state.message}</p>
        <p className="mt-2 text-sm">Le garage vous recontactera pour confirmer votre demande.</p>
        {state.reference ? <p className="mt-4 text-sm font-semibold">Demande n° {state.reference}</p> : null}
      </section>
    )
  }
  const values = state.values
  const inputClass = "min-h-11 rounded-[var(--live-control-radius)] border border-[var(--live-border)] bg-[var(--live-background)] px-3 text-[var(--live-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
  return (
    <section id="vehicle-inquiry" aria-labelledby="vehicle-inquiry-title" className="rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] p-6 sm:p-8">
      <h2 id="vehicle-inquiry-title" className="text-2xl font-semibold">Votre demande concernant {vehicleTitle}</h2>
      <p className="mt-2 text-sm text-[var(--live-muted-foreground)]">
        Un rendez-vous demandé reste à confirmer par le garage.
      </p>
      <form action={action} className="mt-6 grid gap-5 sm:grid-cols-2">
        <input type="hidden" name="garageSlug" value={garageSlug} />
        <input type="hidden" name="vehicleSlug" value={vehicleSlug} />
        <input type="hidden" name="publicPageUrl" value={publicPageUrl} />
        <input type="hidden" name="formStartedAt" value={formStartedAt} />
        <label className="sr-only" aria-hidden="true">
          Site internet
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Type de demande
          <select name="type" defaultValue={values?.type ?? "APPOINTMENT_REQUEST"} className={inputClass}>
            {PUBLIC_VEHICLE_LEAD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <FieldError name="type" errors={state.fieldErrors} />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Nom
          <input name="customerName" defaultValue={values?.customerName} autoComplete="name" className={inputClass} aria-describedby="customerName-error" required />
          <FieldError name="customerName" errors={state.fieldErrors} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Téléphone
          <input name="customerPhone" defaultValue={values?.customerPhone} type="tel" autoComplete="tel" className={inputClass} aria-describedby="customerPhone-error" />
          <FieldError name="customerPhone" errors={state.fieldErrors} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          E-mail
          <input name="customerEmail" defaultValue={values?.customerEmail} type="email" autoComplete="email" className={inputClass} aria-describedby="customerEmail-error" />
          <FieldError name="customerEmail" errors={state.fieldErrors} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Date souhaitée
          <input name="preferredDate" defaultValue={values?.preferredDate} type="date" className={inputClass} aria-describedby="preferredDate-error" />
          <FieldError name="preferredDate" errors={state.fieldErrors} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Horaire ou créneau
          <input name="preferredTime" defaultValue={values?.preferredTime} placeholder="Ex. matin, après 17 h" className={inputClass} aria-describedby="preferredTime-error" />
          <FieldError name="preferredTime" errors={state.fieldErrors} />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Commentaire
          <textarea name="message" defaultValue={values?.message} rows={5} maxLength={2000} className={`${inputClass} py-3`} aria-describedby="message-error" />
          <FieldError name="message" errors={state.fieldErrors} />
        </label>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input name="consentContact" type="checkbox" defaultChecked={values?.consentContact} className="mt-1 size-4" required />
          <span>J’accepte d’être contacté à propos de ma demande.</span>
        </label>
        <FieldError name="consentContact" errors={state.fieldErrors} />
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input name="consentMarketing" type="checkbox" defaultChecked={values?.consentMarketing ?? false} className="mt-1 size-4" />
          <span>J’accepte de recevoir des offres commerciales du garage.</span>
        </label>
        <p className="text-xs leading-5 text-[var(--live-muted-foreground)] sm:col-span-2">
          Les informations transmises sont utilisées par le garage pour répondre à votre demande.
        </p>
        {state.status !== "idle" ? (
          <p aria-live="polite" className="text-sm text-[var(--live-danger)] sm:col-span-2">{state.message}</p>
        ) : null}
        <div className="sm:col-span-2"><SubmitButton /></div>
      </form>
    </section>
  )
}
