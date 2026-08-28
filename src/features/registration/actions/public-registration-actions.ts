"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAppointmentPayment } from "@/features/payments/actions/payment-actions"
import { getPublicRegistrationPortal, uploadPublicRegistrationDocument } from "../storage"

export type PublicRegistrationUploadState = Readonly<{ status: "idle" | "success" | "error"; message: string }>

export async function uploadRegistrationDocument(
  _state: PublicRegistrationUploadState,
  formData: FormData,
): Promise<PublicRegistrationUploadState> {
  const file = formData.get("file")
  if (!(file instanceof File)) return { status: "error", message: "Sélectionnez un fichier." }
  const garageSlug = String(formData.get("garageSlug") ?? "")
  const token = String(formData.get("token") ?? "")
  const result = await uploadPublicRegistrationDocument({ garageSlug, token, requirementId: String(formData.get("requirementId") ?? ""), file })
  if (result.ok) revalidatePath(`/g/${garageSlug}/registration/${token}`)
  return { status: result.ok ? "success" : "error", message: result.message }
}

export type PublicPaymentResumeState = Readonly<{ status: "idle" | "error"; message: string }>

export async function resumePublicRegistrationPayment(
  _state: PublicPaymentResumeState,
  formData: FormData,
): Promise<PublicPaymentResumeState> {
  const garageSlug = String(formData.get("garageSlug") ?? "").trim().toLowerCase()
  const token = String(formData.get("token") ?? "")
  let result: Awaited<ReturnType<typeof createAppointmentPayment>>
  try {
    const portal = await getPublicRegistrationPortal(garageSlug, token)
    if (!portal?.paymentResume || !portal.appointment?.id) return { status: "error", message: "Ce paiement n'est plus disponible." }
    result = await createAppointmentPayment(String(portal.appointment.id), garageSlug)
  } catch (error) {
    console.error("Public payment resume failed", { operation: "resume_public_registration_payment", errorType: error instanceof Error ? error.name : "UnknownError" })
    return { status: "error", message: "Le paiement n'a pas pu démarrer. Vous pouvez réessayer sans recréer votre demande." }
  }
  if (result.ok) redirect(result.url)
  return { status: "error", message: result.reason === "already_paid" ? "Ce paiement a déjà été confirmé." : "Le paiement n'a pas pu démarrer. Vous pouvez réessayer sans recréer votre demande." }
}
