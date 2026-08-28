"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { resumePublicRegistrationPayment, type PublicPaymentResumeState } from "../actions/public-registration-actions"

const initialState: PublicPaymentResumeState = { status: "idle", message: "" }

function PaymentSubmit({ label }: { readonly label: string }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} className="rounded-md bg-[var(--live-primary)] px-4 py-2 text-sm font-semibold text-[var(--live-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Ouverture du paiement…" : label}</button>
}

export function PublicRegistrationPaymentResume({ garageSlug, token, label }: { readonly garageSlug: string; readonly token: string; readonly label: string }) {
  const [state, action] = useActionState(resumePublicRegistrationPayment, initialState)
  return <form action={action} className="mt-4"><input type="hidden" name="garageSlug" value={garageSlug}/><input type="hidden" name="token" value={token}/><PaymentSubmit label={label}/>{state.message ? <p aria-live="polite" className="mt-2 text-sm text-[var(--live-muted-foreground)]">{state.message}</p> : null}</form>
}
