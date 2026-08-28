import { calculateRegistrationProgress } from "../engines"
import { registrationStatusLabels, type RegistrationCase } from "../types"
export type RegistrationCaseViewModel = Readonly<{ id: string; reference: string; title: string; customer: string; vehicle: string; status: string; createdAt: string; transmittedLabel: string; verifiedLabel: string; acceptedPercent: number }>
export function buildRegistrationCaseViewModel(item: RegistrationCase): RegistrationCaseViewModel {
  const progress = calculateRegistrationProgress(item.requirements)
  return { id: item.id, reference: item.publicReference, title: item.procedureTitle, customer: item.customerName, vehicle: [item.registrationNumber, item.brand, item.model].filter(Boolean).join(" · ") || "Véhicule non renseigné", status: registrationStatusLabels[item.status], createdAt: new Intl.DateTimeFormat("fr-FR").format(new Date(item.createdAt)), transmittedLabel: `${progress.transmittedCount}/${progress.requiredCount} documents transmis`, verifiedLabel: `${progress.acceptedCount}/${progress.requiredCount} vérifiés`, acceptedPercent: progress.acceptedPercent }
}

type PublicPaymentAppointment = Readonly<{
  id: string
  status: string
  isHistorical: boolean
  commercialSnapshot: Readonly<Record<string, unknown>> | null
}>

type PublicPayment = Readonly<{ status: string; amountCents: number; currency: string }> | null

export type PublicPaymentResumeViewModel = Readonly<{
  amountCents: number
  currency: "EUR"
  label: string
}>

export function buildPublicPaymentResume(
  appointment: PublicPaymentAppointment | null,
  payment: PublicPayment,
): PublicPaymentResumeViewModel | null {
  if (!appointment || appointment.status !== "AWAITING_PAYMENT" || appointment.isHistorical || payment?.status === "PAID") return null
  const amount = appointment.commercialSnapshot?.amount_due_now_cents
  const currency = appointment.commercialSnapshot?.currency
  const strategy = appointment.commercialSnapshot?.payment_strategy
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || currency !== "EUR" || (strategy !== "FULL_PAYMENT" && strategy !== "DEPOSIT")) return null
  const formatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount / 100)
  return { amountCents: amount, currency, label: strategy === "DEPOSIT" ? `Payer l'acompte de ${formatted}` : `Reprendre le paiement de ${formatted}` }
}
