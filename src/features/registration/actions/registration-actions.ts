"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import { registrationDocumentDecisionSchema, registrationProcedureSchema, registrationRequirementSchema, registrationTransitionSchema } from "../validation"

export async function createStaffRegistrationCase(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const customerId = String(formData.get("customerId") ?? "")
  const procedureType = String(formData.get("procedureType") ?? "")
  const appointmentId = String(formData.get("appointmentId") ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) return

  const db = await createClient()
  const { data, error } = await db.rpc("create_staff_registration_case", {
    p_garage_id: session.garageId,
    p_customer_id: customerId,
    p_procedure_type: procedureType,
    p_registration: String(formData.get("registrationNumber") ?? "") || null,
    p_brand: String(formData.get("brand") ?? "") || null,
    p_model: String(formData.get("model") ?? "") || null,
    p_appointment_id: /^[0-9a-f-]{36}$/i.test(appointmentId) ? appointmentId : null,
  })

  if (error) return
  const row = Array.isArray(data) ? data[0] as { case_id?: string } : null
  if (!row?.case_id) return

  revalidatePath("/registration")
  revalidatePath(`/customers/${customerId}`)
  revalidatePath("/dashboard")
  redirect(`/registration/${row.case_id}`)
}

export async function saveRegistrationProcedure(formData: FormData): Promise<void> { const session = await getActiveGarageSession(); if (!session?.garageId || !["owner","admin"].includes(session.memberRole ?? "")) return; const procedure = registrationProcedureSchema.safeParse({ type: formData.get("type"), title: formData.get("title"), description: formData.get("description") || undefined, isActive: formData.get("isActive") === "on", isPublic: formData.get("isPublic") === "on", displayOrder: Number(formData.get("displayOrder") ?? 0) }); if (!procedure.success) return; const db = await createClient(); const { data, error } = await db.from("registration_procedures").upsert({ garage_id: session.garageId, procedure_type: procedure.data.type, title: procedure.data.title, description: procedure.data.description ?? null, is_active: procedure.data.isActive, is_public: procedure.data.isPublic, display_order: procedure.data.displayOrder, updated_at: new Date().toISOString() }, { onConflict: "garage_id,procedure_type" }).select("id").single(); if (error || !data) return; const key = String(formData.get("requirementKey") ?? "").trim(); if (key) { const requirement = registrationRequirementSchema.safeParse({ key, label: formData.get("requirementLabel"), description: formData.get("requirementDescription") || undefined, isRequired: formData.get("requirementRequired") === "on", displayOrder: Number(formData.get("requirementOrder") ?? 0) }); if (requirement.success) await db.from("registration_procedure_requirements").upsert({ garage_id: session.garageId, procedure_id: data.id, requirement_key: requirement.data.key, label: requirement.data.label, description: requirement.data.description ?? null, is_required: requirement.data.isRequired, display_order: requirement.data.displayOrder }, { onConflict: "procedure_id,requirement_key" }) } revalidatePath("/settings/services/registration"); revalidatePath(`/g/${session.garageSlug}/contact`) }
export async function transitionRegistrationCase(formData: FormData): Promise<void> { const parsed = registrationTransitionSchema.safeParse({ caseId: formData.get("caseId"), status: formData.get("status") }); if (!parsed.success) return; const { data } = await (await createClient()).rpc("transition_registration_case", { p_case_id: parsed.data.caseId, p_status: parsed.data.status }); if (data) { revalidatePath(`/registration/${parsed.data.caseId}`); revalidatePath("/registration"); revalidatePath("/dashboard") } }
export async function reviewRegistrationDocument(formData: FormData): Promise<void> { const session = await getActiveGarageSession(); if (!session?.garageId) return; const parsed = registrationDocumentDecisionSchema.safeParse({ documentId: formData.get("documentId"), status: formData.get("status"), rejectionReason: formData.get("rejectionReason") || undefined }); if (!parsed.success) return; const db = await createClient(); const { data } = await db.from("registration_documents").update({ status: parsed.data.status, rejection_reason: parsed.data.rejectionReason ?? null, reviewed_at: new Date().toISOString(), reviewed_by: session.userId }).eq("garage_id", session.garageId).eq("id", parsed.data.documentId).select("case_id,case_requirement_id").maybeSingle(); if (!data) return; await db.from("registration_case_requirements").update({ status: parsed.data.status, rejection_reason: parsed.data.rejectionReason ?? null, updated_at: new Date().toISOString() }).eq("garage_id", session.garageId).eq("id", data.case_requirement_id); await db.from("registration_case_events").insert({ garage_id: session.garageId, case_id: data.case_id, actor_id: session.userId, event_type: parsed.data.status === "ACCEPTED" ? "DOCUMENT_ACCEPTED" : "DOCUMENT_REJECTED", metadata: { documentId: parsed.data.documentId } }); revalidatePath(`/registration/${data.case_id}`) }
