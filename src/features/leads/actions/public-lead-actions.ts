"use server"

import { revalidatePath } from "next/cache"

import {
  getPublicVehicleBySlug,
  resolvePublicGarageContext,
} from "@/features/live-stock"
import { createPublicLead } from "../data"
import { onLeadCreated } from "../events"
import { buildPublicLeadReference, guardLeadSubmission } from "../engine"
import type { PublicLeadActionState } from "../types"
import { parsePublicLeadInput, validatePublicLead } from "../validation"

const outcomeMessages: Record<
  Exclude<PublicLeadActionState["status"], "idle" | "success" | "validation_error">,
  string
> = {
  unavailable_vehicle: "Ce véhicule n’est plus disponible. Vous pouvez néanmoins contacter le garage.",
  unavailable_garage: "Le formulaire est temporairement indisponible.",
  rate_limited: "Trop de demandes ont été envoyées. Merci de réessayer plus tard.",
  duplicate_submission: "Votre demande a déjà été transmise.",
  persistence_error: "Votre demande n’a pas pu être transmise. Merci de réessayer.",
}

export async function submitPublicVehicleLead(
  _previousState: PublicLeadActionState,
  formData: FormData
): Promise<PublicLeadActionState> {
  const raw = parsePublicLeadInput(formData)
  const validation = validatePublicLead(raw)
  if (!validation.success) {
    return {
      status: "validation_error",
      message: "Vérifiez les informations saisies.",
      fieldErrors: validation.error.flatten().fieldErrors,
      values: raw,
    }
  }
  const guard = guardLeadSubmission(validation.data)
  if (!guard.allowed) {
    return {
      status: "rate_limited",
      message: guard.reason === "honeypot"
        ? "Votre demande n’a pas pu être transmise."
        : "Le formulaire a été envoyé trop rapidement. Merci de réessayer.",
      values: raw,
    }
  }
  const garage = await resolvePublicGarageContext(validation.data.garageSlug)
  if (!garage) return { status: "unavailable_garage", message: outcomeMessages.unavailable_garage }
  const vehicle = await getPublicVehicleBySlug(garage, validation.data.vehicleSlug)
  if (!vehicle) return { status: "unavailable_vehicle", message: outcomeMessages.unavailable_vehicle }
  const securedInput = {
    ...validation.data,
    publicPageUrl: `${garage.basePath}/vehicles/${encodeURIComponent(vehicle.slug)}`,
  }

  const result = await createPublicLead({ input: securedInput, fingerprint: guard.fingerprint })
  if (result.outcome !== "success") {
    return { status: result.outcome, message: outcomeMessages[result.outcome], values: raw }
  }
  revalidatePath("/leads")
  revalidatePath("/dashboard")
  await onLeadCreated({
    leadId: result.leadId,
    garageSlug: garage.garageSlug,
    vehicleSlug: vehicle.slug,
  }).catch((error: unknown) => {
    console.error("Lead created extension failed", {
      operation: "onLeadCreated",
      errorType: error instanceof Error ? error.name : "unknown",
    })
  })
  return {
    status: "success",
    message: "Votre demande a bien été transmise au garage.",
    reference: buildPublicLeadReference(result.leadId),
  }
}
