"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  buildVehicleDocumentStoragePath,
  hasValidDocumentSignature,
  validateDocumentFile,
  vehicleDocumentMetadataSchema,
} from "./document-validation"
import type { VehicleDocumentActionState } from "./types"

const BUCKET = "vehicle-documents"

function validationState(message: string, errors?: Record<string, string[] | undefined>): VehicleDocumentActionState {
  return { success: false, message, errors }
}

async function getAuthenticatedContext(vehicleId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Utilisateur non authentifié." } as const
  const { data: vehicle, error } = await supabase.from("vehicles").select("id, garage_id").eq("id", vehicleId).maybeSingle()
  if (error || !vehicle) return { error: "Véhicule introuvable ou inaccessible." } as const
  return { supabase, user, vehicle } as const
}

export async function addVehicleDocument(
  vehicleId: string,
  _previousState: VehicleDocumentActionState,
  formData: FormData
): Promise<VehicleDocumentActionState> {
  const metadata = vehicleDocumentMetadataSchema.safeParse({ category: formData.get("category"), label: formData.get("label") })
  if (!metadata.success) return validationState("Vérifiez les informations du document.", metadata.error.flatten().fieldErrors)
  const fileValue = formData.get("file")
  if (!(fileValue instanceof File)) return validationState("Sélectionnez un fichier.", { file: ["Le fichier est obligatoire."] })
  const fileError = validateDocumentFile(fileValue)
  if (fileError) return validationState(fileError, { file: [fileError] })
  if (!(await hasValidDocumentSignature(fileValue))) {
    return validationState("Le contenu du fichier ne correspond pas au format annoncé.", { file: ["Signature de fichier invalide."] })
  }

  const context = await getAuthenticatedContext(vehicleId)
  if ("error" in context) return validationState(context.error ?? "Accès refusé.")
  const documentId = crypto.randomUUID()
  const storagePath = buildVehicleDocumentStoragePath({
    garageId: context.vehicle.garage_id, vehicleId, documentId, filename: fileValue.name,
  })
  const { error: uploadError } = await context.supabase.storage.from(BUCKET).upload(storagePath, fileValue, {
    contentType: fileValue.type, upsert: false,
  })
  if (uploadError) return validationState(`Téléversement impossible : ${uploadError.message}`)

  const { error: insertError } = await context.supabase.from("vehicle_documents").insert({
    id: documentId,
    garage_id: context.vehicle.garage_id,
    vehicle_id: vehicleId,
    category: metadata.data.category,
    label: metadata.data.label,
    original_filename: fileValue.name,
    storage_path: storagePath,
    mime_type: fileValue.type,
    size_bytes: fileValue.size,
    uploaded_by: context.user.id,
  })
  if (insertError) {
    const { error: cleanupError } = await context.supabase.storage.from(BUCKET).remove([storagePath])
    if (cleanupError) console.error("vehicle_document_upload_cleanup_failed", { documentId, code: cleanupError.name })
    return validationState(`Enregistrement impossible : ${insertError.message}`)
  }
  revalidatePath(`/stock/${vehicleId}`)
  return { success: true, message: "Document ajouté." }
}

export async function updateVehicleDocument(
  documentId: string,
  vehicleId: string,
  _previousState: VehicleDocumentActionState,
  formData: FormData
): Promise<VehicleDocumentActionState> {
  const metadata = vehicleDocumentMetadataSchema.safeParse({ category: formData.get("category"), label: formData.get("label") })
  if (!metadata.success) return validationState("Vérifiez les informations du document.", metadata.error.flatten().fieldErrors)
  const context = await getAuthenticatedContext(vehicleId)
  if ("error" in context) return validationState(context.error ?? "Accès refusé.")
  const { data, error } = await context.supabase.from("vehicle_documents")
    .update(metadata.data).eq("id", documentId).eq("vehicle_id", vehicleId).select("id").maybeSingle()
  if (error || !data) return validationState(error?.message ?? "Document introuvable ou inaccessible.")
  revalidatePath(`/stock/${vehicleId}`)
  return { success: true, message: "Document modifié." }
}

export async function deleteVehicleDocument(documentId: string, vehicleId: string): Promise<VehicleDocumentActionState> {
  const context = await getAuthenticatedContext(vehicleId)
  if ("error" in context) return validationState(context.error ?? "Accès refusé.")
  const { data: document, error: readError } = await context.supabase.from("vehicle_documents")
    .select("storage_path").eq("id", documentId).eq("vehicle_id", vehicleId).maybeSingle()
  if (readError || !document) return validationState(readError?.message ?? "Document introuvable ou inaccessible.")
  const { error: storageError } = await context.supabase.storage.from(BUCKET).remove([document.storage_path])
  if (storageError) return validationState(`Suppression du fichier impossible : ${storageError.message}`)
  const { error: databaseError } = await context.supabase.from("vehicle_documents").delete().eq("id", documentId).eq("vehicle_id", vehicleId)
  if (databaseError) {
    console.error("vehicle_document_database_delete_failed_after_storage", { documentId, code: databaseError.code })
    return validationState("Le fichier a été supprimé, mais son enregistrement n’a pas pu être finalisé. Contactez le support.")
  }
  revalidatePath(`/stock/${vehicleId}`)
  return { success: true, message: "Document supprimé." }
}

export async function createVehicleDocumentSignedUrl(
  documentId: string,
  vehicleId: string,
  download: boolean
): Promise<{ success: boolean; url?: string; message?: string }> {
  const context = await getAuthenticatedContext(vehicleId)
  if ("error" in context) return { success: false, message: context.error ?? "Accès refusé." }
  const { data: document, error } = await context.supabase.from("vehicle_documents")
    .select("storage_path, original_filename").eq("id", documentId).eq("vehicle_id", vehicleId).maybeSingle()
  if (error || !document) return { success: false, message: "Document introuvable ou inaccessible." }
  const { data, error: signedError } = await context.supabase.storage.from(BUCKET)
    .createSignedUrl(document.storage_path, 60, download ? { download: document.original_filename } : undefined)
  if (signedError || !data) return { success: false, message: "Impossible de générer le lien temporaire." }
  return { success: true, url: data.signedUrl }
}
