"use server"

import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"
import { resolvePublicGarageContext } from "@/features/live-stock/data/public-garage-repository"
import { buildPublicLeadReference } from "@/features/leads/engine"
import { isPublicRequestAvailable } from "../engine"
import { createPublicCustomerRequest } from "../repositories"
import type { PublicRequestState } from "../types"
import { validatePublicRequest } from "../validation"

const humanError = "Nous n’avons pas pu transmettre votre demande. Vérifiez vos informations puis réessayez."
export async function submitPublicCustomerRequest(_state: PublicRequestState, formData: FormData): Promise<PublicRequestState> {
  const raw = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)])) as Record<string, unknown>
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
  revalidatePath("/leads"); revalidatePath("/commercial"); revalidatePath("/dashboard"); revalidatePath("/notifications")
  return { status: "success", message: `Votre demande a bien été transmise. L’équipe de ${garage.displayName} vous recontactera rapidement.`, reference: buildPublicLeadReference(result.leadId) }
  } catch (error) {
    console.error("Public request submission failed", { operation: "submit_public_customer_request", errorType: error instanceof Error ? error.name : "UnknownError" })
    return { status: "persistence_error", message: humanError }
  }
}
