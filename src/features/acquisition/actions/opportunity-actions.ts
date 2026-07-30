"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveGarageSession } from "@/features/tenant"
import { canTransitionAcquisition } from "../engine/opportunity-workflow"
import type { AcquisitionActionState, AcquisitionStatus } from "../types/opportunity"
import {
  acquisitionDocumentSchema,
  acquisitionStatusChangeSchema,
  parseAcquisitionFormData,
  type ValidAcquisitionOpportunityInput,
} from "../validation/opportunity-validation"

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
])

function stateErrors(error: { flatten(): { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors
}

async function context() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return null
  return { session, garageId: session.garageId, supabase: await createClient() }
}

function opportunityValues(
  input: ValidAcquisitionOpportunityInput,
  garageId: string,
  creatorUserId?: string,
  sellerId?: string
) {
  return {
    garage_id: garageId,
    ...(creatorUserId ? { creator_user_id: creatorUserId } : {}),
    ...(sellerId ? { seller_id: sellerId } : {}),
    provenance: input.provenance,
    confidence_level: input.confidenceLevel,
    registration: input.registration ?? null,
    vin: input.vin?.toUpperCase() ?? null,
    brand: input.brand,
    model: input.model,
    trim: input.trim ?? null,
    year: input.year ?? null,
    fuel: input.fuel ?? null,
    gearbox: input.gearbox ?? null,
    mileage: input.mileage ?? null,
    color: input.color ?? null,
    options: [...input.options],
    general_condition: input.generalCondition,
    asking_price: input.askingPrice ?? null,
    repair_estimate: input.repairEstimate ?? null,
    comments: input.comments ?? null,
    source_url: input.sourceUrl ?? null,
  }
}

export async function createAcquisitionOpportunity(
  _previousState: AcquisitionActionState,
  formData: FormData
): Promise<AcquisitionActionState> {
  const parsed = parseAcquisitionFormData(formData)
  if (!parsed.success) return {
    success: false, message: "Vérifiez les informations saisies.",
    errors: stateErrors(parsed.error),
  }
  const resolved = await context()
  if (!resolved) return { success: false, message: "Session garage introuvable." }
  const sellerValues = {
    garage_id: resolved.garageId,
    created_by_user_id: resolved.session.userId,
    type: parsed.data.sellerType,
    name: parsed.data.sellerName,
    phone: parsed.data.sellerPhone ?? null,
    email: parsed.data.sellerEmail ?? null,
    city: parsed.data.sellerCity ?? null,
    internal_comments: parsed.data.sellerComments ?? null,
  }
  const { data: seller, error: sellerError } = await resolved.supabase
    .from("acquisition_sellers").insert(sellerValues).select("id").single()
  if (sellerError) return { success: false, message: `Création du vendeur impossible (${sellerError.code}).` }
  const { data: opportunity, error } = await resolved.supabase
    .from("acquisition_opportunities")
    .insert(opportunityValues(
      parsed.data, resolved.garageId, resolved.session.userId, seller.id
    ))
    .select("id").single()
  if (error) {
    await resolved.supabase.from("acquisition_sellers").delete().eq("id", seller.id)
    return { success: false, message: `Création de l'opportunité impossible (${error.code}).` }
  }
  revalidatePath("/acquisition")
  return { success: true, message: "Opportunité créée.", opportunityId: opportunity.id }
}

export async function updateAcquisitionOpportunity(
  opportunityId: string,
  _previousState: AcquisitionActionState,
  formData: FormData
): Promise<AcquisitionActionState> {
  const parsed = parseAcquisitionFormData(formData)
  if (!parsed.success) return {
    success: false, message: "Vérifiez les informations saisies.",
    errors: stateErrors(parsed.error),
  }
  const resolved = await context()
  if (!resolved) return { success: false, message: "Session garage introuvable." }
  const { data: opportunity, error: readError } = await resolved.supabase
    .from("acquisition_opportunities").select("id,seller_id")
    .eq("id", opportunityId).eq("garage_id", resolved.garageId).maybeSingle()
  if (readError || !opportunity) return { success: false, message: "Opportunité inaccessible." }
  const { error: sellerError } = await resolved.supabase.from("acquisition_sellers").update({
    type: parsed.data.sellerType, name: parsed.data.sellerName,
    phone: parsed.data.sellerPhone ?? null, email: parsed.data.sellerEmail ?? null,
    city: parsed.data.sellerCity ?? null,
    internal_comments: parsed.data.sellerComments ?? null,
  }).eq("id", opportunity.seller_id).eq("garage_id", resolved.garageId)
  if (sellerError) return { success: false, message: `Mise à jour du vendeur impossible (${sellerError.code}).` }
  const { error } = await resolved.supabase.from("acquisition_opportunities")
    .update(opportunityValues(parsed.data, resolved.garageId))
    .eq("id", opportunityId).eq("garage_id", resolved.garageId)
  if (error) return { success: false, message: `Mise à jour impossible (${error.code}).` }
  revalidatePath("/acquisition")
  revalidatePath(`/acquisition/${opportunityId}`)
  return { success: true, message: "Opportunité mise à jour.", opportunityId }
}

export async function changeAcquisitionStatus(formData: FormData): Promise<void> {
  const parsed = acquisitionStatusChangeSchema.safeParse({
    opportunityId: formData.get("opportunityId"), status: formData.get("status"),
  })
  if (!parsed.success) return
  const resolved = await context()
  if (!resolved) return
  const { data: current, error } = await resolved.supabase
    .from("acquisition_opportunities").select("status")
    .eq("id", parsed.data.opportunityId).eq("garage_id", resolved.garageId).maybeSingle()
  if (error || !current) return
  if (!canTransitionAcquisition(current.status as AcquisitionStatus, parsed.data.status)) return
  const { error: updateError } = await resolved.supabase.from("acquisition_opportunities")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.opportunityId).eq("garage_id", resolved.garageId)
    .eq("status", current.status)
  if (updateError) throw new Error(`Changement de statut impossible (${updateError.code}).`)
  revalidatePath("/acquisition")
  revalidatePath(`/acquisition/${parsed.data.opportunityId}`)
}

export async function deleteAcquisitionOpportunity(formData: FormData): Promise<void> {
  const id = String(formData.get("opportunityId") ?? "")
  const resolved = await context()
  if (!resolved || !id) return
  const { data: opportunity } = await resolved.supabase
    .from("acquisition_opportunities").select("seller_id")
    .eq("id", id).eq("garage_id", resolved.garageId).maybeSingle()
  if (!opportunity) return
  const { data: documents } = await resolved.supabase.from("acquisition_documents")
    .select("storage_path").eq("opportunity_id", id).eq("garage_id", resolved.garageId)
  const { error } = await resolved.supabase.from("acquisition_opportunities")
    .delete().eq("id", id).eq("garage_id", resolved.garageId)
  if (error) throw new Error(`Suppression impossible (${error.code}).`)
  const { error: sellerCleanupError } = await resolved.supabase
    .from("acquisition_sellers").delete()
    .eq("id", opportunity.seller_id).eq("garage_id", resolved.garageId)
  if (sellerCleanupError && sellerCleanupError.code !== "23503") {
    console.error("Acquisition seller cleanup failed", {
      operation: "deleteAcquisitionOpportunity", code: sellerCleanupError.code,
    })
  }
  const paths = (documents ?? []).map((document) => document.storage_path as string)
  if (paths.length) {
    const { error: storageError } = await resolved.supabase.storage
      .from("acquisition-documents").remove(paths)
    if (storageError) console.error("Acquisition document cleanup failed", {
      operation: "deleteAcquisitionOpportunity", code: storageError.message,
    })
  }
  revalidatePath("/acquisition")
  redirect("/acquisition")
}

export async function uploadAcquisitionDocument(formData: FormData): Promise<void> {
  const parsed = acquisitionDocumentSchema.safeParse({
    opportunityId: formData.get("opportunityId"),
    category: formData.get("category"),
    label: formData.get("label"),
  })
  const file = formData.get("file")
  if (!parsed.success || !(file instanceof File) || file.size === 0 ||
      file.size > MAX_DOCUMENT_SIZE || !ALLOWED_DOCUMENT_TYPES.has(file.type)) return
  const resolved = await context()
  if (!resolved) return
  const { data: opportunity } = await resolved.supabase.from("acquisition_opportunities")
    .select("id").eq("id", parsed.data.opportunityId)
    .eq("garage_id", resolved.garageId).maybeSingle()
  if (!opportunity) return
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin"
  const storagePath = `${resolved.garageId}/${opportunity.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await resolved.supabase.storage
    .from("acquisition-documents").upload(storagePath, file, { contentType: file.type })
  if (uploadError) throw new Error(`Import impossible (${uploadError.message}).`)
  const { error } = await resolved.supabase.from("acquisition_documents").insert({
    garage_id: resolved.garageId, opportunity_id: opportunity.id,
    uploaded_by_user_id: resolved.session.userId, category: parsed.data.category,
    label: parsed.data.label, original_filename: file.name, storage_path: storagePath,
    mime_type: file.type, size_bytes: file.size,
  })
  if (error) {
    await resolved.supabase.storage.from("acquisition-documents").remove([storagePath])
    throw new Error(`Enregistrement impossible (${error.code}).`)
  }
  revalidatePath(`/acquisition/${opportunity.id}`)
}

export async function deleteAcquisitionDocument(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "")
  const opportunityId = String(formData.get("opportunityId") ?? "")
  const resolved = await context()
  if (!resolved || !documentId || !opportunityId) return
  const { data: document } = await resolved.supabase.from("acquisition_documents")
    .select("id,storage_path").eq("id", documentId).eq("opportunity_id", opportunityId)
    .eq("garage_id", resolved.garageId).maybeSingle()
  if (!document) return
  const { error } = await resolved.supabase.from("acquisition_documents")
    .delete().eq("id", document.id).eq("garage_id", resolved.garageId)
  if (error) throw new Error(`Suppression du document impossible (${error.code}).`)
  const { error: storageError } = await resolved.supabase.storage
    .from("acquisition-documents").remove([document.storage_path])
  if (storageError) console.error("Acquisition document cleanup failed", {
    operation: "deleteAcquisitionDocument", code: storageError.message,
  })
  revalidatePath(`/acquisition/${opportunityId}`)
}
