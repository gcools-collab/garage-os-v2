"use server"

import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"
import { resolvePublicGarageContext } from "@/features/live-stock/data/public-garage-repository"
import { buildPublicLeadReference } from "@/features/leads/engine"
import { isPublicRequestAvailable } from "../engine"
import { createPublicCustomerRequest } from "../repositories"
import type { PublicRequestState } from "../types"
import { validatePublicRequest } from "../validation"
import { bookPublicAppointment, createPublicRegistrationCase } from "@/features/scheduling/repositories/scheduling-repository"
import { startAppointmentPayment } from "@/features/payments/services/payment-creation-service"

const humanError = "Nous n’avons pas pu transmettre votre demande. Vérifiez vos informations puis réessayez."
export async function submitPublicCustomerRequest(_state: PublicRequestState, formData: FormData): Promise<PublicRequestState> {
  const raw = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)])) as Record<string, unknown>
  raw.offerOptionIds = formData.getAll("offerOptionIds").map(String)
  raw.consentContact = formData.get("consentContact") === "on"
  raw.consentMarketing = formData.get("consentMarketing") === "on"
  raw.formStartedAt = Number(formData.get("formStartedAt"))
  const validation = validatePublicRequest(raw)
  if (!validation.success) return { status: "validation_error", message: "Vérifiez les informations saisies.", fieldErrors: validation.error.flatten().fieldErrors }
  try {
  const data = validation.data
  const garage = await resolvePublicGarageContext(data.garageSlug)
  if (!garage || !isPublicRequestAvailable(data.requestType, garage.serviceConfigurations ?? [])) return { status: "unavailable", message: humanError }
  const fingerprint = createHash("sha256").update([data.garageSlug, data.requestType, data.email ?? "", data.phone ?? "", data.vehicleSlug ?? ""].join("|")).digest("hex")
  const result = await createPublicCustomerRequest({
    garageSlug: garage.garageSlug, vehicleSlug: data.vehicleSlug, requestType: data.requestType, source: data.source,
    customerName: `${data.firstName} ${data.lastName}`.trim(), phone: data.phone, email: data.email,
    preferredDate: data.preferredDate, preferredTime: data.preferredTime, message: data.message,
    payload: data.payload, publicPageUrl: data.publicPageUrl, consentContact: data.consentContact,
    consentMarketing: data.consentMarketing, fingerprint,
  })
  if (result.outcome !== "success" || !result.leadId) {
    const status = result.outcome === "rate_limited" ? "rate_limited" : result.outcome === "duplicate_submission" ? "duplicate_submission" : result.outcome === "service_unavailable" || result.outcome === "unavailable_vehicle" || result.outcome === "unavailable_garage" ? "unavailable" : "persistence_error"
    return { status, message: status === "duplicate_submission" ? "Votre demande a déjà été transmise." : humanError }
  }
  let appointmentStatus: "PENDING" | "CONFIRMED" | "AWAITING_PAYMENT" | undefined
  let paymentUrl: string | undefined
  let registrationUrl: string | undefined
  if (data.appointmentStartsAt) {
    const persistedOptionIds = (data.offerOptionIds ?? []).filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    const booking = await bookPublicAppointment({
      offerSlug: data.offerSlug,
      garageSlug: data.garageSlug,
      vehicleSlug: data.vehicleSlug,
      leadId: result.leadId,
      type: data.requestType,
      startsAt: data.appointmentStartsAt,
      customerName: `${data.firstName} ${data.lastName}`.trim(),
      phone: data.phone,
      email: data.email,
      details: data.payload,
      fingerprint,
      optionIds: persistedOptionIds,
    })
    if (booking.outcome !== "success") return { status: "unavailable", message: "Ce créneau n’est plus disponible. Votre demande a été conservée et le garage pourra vous recontacter." }
    if (booking.status === "PENDING" || booking.status === "CONFIRMED" || booking.status === "AWAITING_PAYMENT") appointmentStatus = booking.status
    if (booking.status === "AWAITING_PAYMENT" && booking.appointmentId) { const payment = await startAppointmentPayment(booking.appointmentId, data.garageSlug); if (payment.ok) paymentUrl = payment.url }
    if (data.requestType === "REGISTRATION" && booking.appointmentId) { const token = await createPublicRegistrationCase({ garageSlug: data.garageSlug, appointmentId: booking.appointmentId, leadId: result.leadId, fingerprint, procedure: String(data.payload.procedure ?? "OTHER"), registration: typeof data.payload.registration === "string" ? data.payload.registration : null, brand: typeof data.payload.brand === "string" ? data.payload.brand : null, model: typeof data.payload.model === "string" ? data.payload.model : null }); if (token) registrationUrl = `/g/${data.garageSlug}/registration/${token}` }
  }
  revalidatePath("/leads"); revalidatePath("/commercial"); revalidatePath("/dashboard"); revalidatePath("/notifications")
  const bookingMessage = appointmentStatus === "CONFIRMED" ? " Votre rendez-vous est confirmé." : appointmentStatus === "PENDING" ? " Le garage doit encore confirmer votre rendez-vous." : appointmentStatus === "AWAITING_PAYMENT" ? " Votre créneau est réservé temporairement et devra être payé pour être confirmé." : ""
  return { status: "success", paymentUrl, registrationUrl, message: `Votre demande a bien été transmise.${bookingMessage || ` L’équipe de ${garage.displayName} vous recontactera rapidement.`}`, reference: buildPublicLeadReference(result.leadId), appointmentStatus }
  } catch (error) {
    console.error("Public request submission failed", { operation: "submit_public_customer_request", errorType: error instanceof Error ? error.name : "UnknownError" })
    return { status: "persistence_error", message: humanError }
  }
}
