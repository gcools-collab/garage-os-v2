"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getActiveGarageSession } from "@/features/tenant"
import {
  canAssignLead,
  canManageCommercialTask,
  canManageLeadNote,
  canTransitionCommercialTaskStatus,
  resolveEffectiveTaskStatus,
} from "../engine"
import {
  closeLeadSchema,
  contactLogSchema,
  leadAssignmentSchema,
  leadNoteSchema,
  taskSchema,
  taskStatusSchema,
} from "../validation"
import type { CommercialTaskStatus, LeadLossReason } from "../types"

function revalidateCommercial(leadId?: string) {
  revalidatePath("/commercial")
  revalidatePath("/leads")
  revalidatePath("/dashboard")
  revalidatePath("/notifications")
  if (leadId) revalidatePath(`/leads/${leadId}`)
}

async function context() {
  const session = await getActiveGarageSession()
  const garageId = session?.garageId
  const memberRole = session?.memberRole
  if (!session || !garageId || !memberRole) return null
  return {
    session: { ...session, garageId, memberRole },
    supabase: await createClient(),
  }
}

async function persistEvent(input: {
  readonly leadId: string
  readonly garageId: string
  readonly actorUserId: string
  readonly eventType: string
  readonly metadata?: Readonly<Record<string, unknown>>
}) {
  const { error } = await (await createClient()).from("lead_events").insert({
    lead_id: input.leadId,
    garage_id: input.garageId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  })
  if (error) console.error("Commercial event persistence failed", {
    operation: "persistEvent",
    code: error.code,
    eventType: input.eventType,
  })
}

async function persistNotification(input: {
  readonly garageId: string
  readonly userId: string | null
  readonly title: string
  readonly message: string
  readonly leadId: string
}) {
  const { error } = await (await createClient()).from("notifications").insert({
    garage_id: input.garageId,
    user_id: input.userId,
    type: "LEAD_ASSIGNED",
    title: input.title,
    message: input.message,
    href: `/leads/${input.leadId}`,
    entity_type: "lead",
    entity_id: input.leadId,
  })
  if (error) console.error("Commercial notification persistence failed", {
    operation: "persistNotification",
    code: error.code,
    type: "LEAD_ASSIGNED",
  })
}

async function leadBelongsToGarage(leadId: string, garageId: string) {
  const { data, error } = await (await createClient())
    .from("leads")
    .select("id,status,assigned_user_id,first_contacted_at")
    .eq("id", leadId)
    .eq("garage_id", garageId)
    .maybeSingle()
  if (error) throw new Error(`Vérification du prospect impossible (${error.code}).`)
  return data
}

export async function assignLeadToCurrentUser(formData: FormData): Promise<void> {
  const parsed = z.object({ leadId: z.uuid() }).safeParse({
    leadId: String(formData.get("leadId") ?? ""),
  })
  if (!parsed.success) return
  const resolved = await context()
  if (!resolved || !canAssignLead(resolved.session.memberRole, true)) return
  if (!await leadBelongsToGarage(parsed.data.leadId, resolved.session.garageId)) return
  const { error } = await resolved.supabase
    .from("leads")
    .update({ assigned_user_id: resolved.session.userId })
    .eq("id", parsed.data.leadId)
    .eq("garage_id", resolved.session.garageId)
  if (error) throw new Error(`Attribution impossible (${error.code}).`)
  await persistEvent({
    leadId: parsed.data.leadId,
    garageId: resolved.session.garageId,
    actorUserId: resolved.session.userId,
    eventType: "ASSIGNED",
    metadata: { assignedUserId: resolved.session.userId },
  })
  await persistNotification({
    garageId: resolved.session.garageId,
    userId: resolved.session.userId,
    title: "Prospect pris en charge",
    message: "Un prospect vous est désormais attribué.",
    leadId: parsed.data.leadId,
  })
  revalidateCommercial(parsed.data.leadId)
}

export async function assignLead(formData: FormData): Promise<void> {
  const parsed = leadAssignmentSchema.safeParse({
    leadId: String(formData.get("leadId") ?? ""),
    assignedUserId: String(formData.get("assignedUserId") ?? "") || undefined,
  })
  if (!parsed.success || !parsed.data.assignedUserId) return
  const resolved = await context()
  if (!resolved) return
  const isCurrentUser = parsed.data.assignedUserId === resolved.session.userId
  if (!canAssignLead(resolved.session.memberRole, isCurrentUser)) return
  if (!await leadBelongsToGarage(parsed.data.leadId, resolved.session.garageId)) return
  const authorizedMember = resolved.session.availableGarages.some(
    (garage) => garage.garageId === resolved.session.garageId
  )
  if (!authorizedMember) return
  const { data: targetMember } = await resolved.supabase
    .from("garage_members")
    .select("user_id")
    .eq("garage_id", resolved.session.garageId)
    .eq("user_id", parsed.data.assignedUserId)
    .maybeSingle()
  if (!targetMember) return
  const { error } = await resolved.supabase
    .from("leads")
    .update({ assigned_user_id: parsed.data.assignedUserId })
    .eq("id", parsed.data.leadId)
    .eq("garage_id", resolved.session.garageId)
  if (error) throw new Error(`Attribution impossible (${error.code}).`)
  await persistEvent({
    leadId: parsed.data.leadId,
    garageId: resolved.session.garageId,
    actorUserId: resolved.session.userId,
    eventType: "ASSIGNED",
    metadata: { assignedUserId: parsed.data.assignedUserId },
  })
  await persistNotification({
    garageId: resolved.session.garageId,
    userId: parsed.data.assignedUserId,
    title: "Nouveau prospect attribué",
    message: "Un prospect nécessite votre suivi.",
    leadId: parsed.data.leadId,
  })
  revalidateCommercial(parsed.data.leadId)
}

export async function createCommercialTask(formData: FormData): Promise<void> {
  const parsed = taskSchema.safeParse({
    leadId: String(formData.get("leadId") ?? "") || undefined,
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    dueAt: String(formData.get("dueAt") ?? ""),
    assignedUserId: String(formData.get("assignedUserId") ?? "") || undefined,
  })
  if (!parsed.success) return
  const resolved = await context()
  if (!resolved || !canManageCommercialTask(resolved.session.memberRole)) return
  if (parsed.data.leadId && !await leadBelongsToGarage(parsed.data.leadId, resolved.session.garageId)) return
  const assigneeId = parsed.data.assignedUserId ?? resolved.session.userId
  if (!canAssignLead(
    resolved.session.memberRole,
    assigneeId === resolved.session.userId
  )) return
  const { data: assignee } = await resolved.supabase
    .from("garage_members")
    .select("user_id")
    .eq("garage_id", resolved.session.garageId)
    .eq("user_id", assigneeId)
    .maybeSingle()
  if (!assignee) return
  const { error } = await resolved.supabase.from("commercial_tasks").insert({
    garage_id: resolved.session.garageId,
    lead_id: parsed.data.leadId ?? null,
    assigned_user_id: assigneeId,
    created_by_user_id: resolved.session.userId,
    type: parsed.data.type,
    status: "OPEN",
    priority: "NORMAL",
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    due_at: new Date(parsed.data.dueAt).toISOString(),
  })
  if (error) throw new Error(`Création de la tâche impossible (${error.code}).`)
  if (parsed.data.leadId) {
    await resolved.supabase
      .from("leads")
      .update({ next_action_at: new Date(parsed.data.dueAt).toISOString() })
      .eq("id", parsed.data.leadId)
      .eq("garage_id", resolved.session.garageId)
    await persistEvent({
      leadId: parsed.data.leadId,
      garageId: resolved.session.garageId,
      actorUserId: resolved.session.userId,
      eventType: "TASK_CREATED",
      metadata: { taskType: parsed.data.type, dueAt: new Date(parsed.data.dueAt).toISOString() },
    })
  }
  revalidateCommercial(parsed.data.leadId)
}

export async function updateCommercialTaskStatus(formData: FormData): Promise<void> {
  const parsed = taskStatusSchema.safeParse({
    taskId: String(formData.get("taskId") ?? ""),
    status: String(formData.get("status") ?? ""),
    snoozedUntil: String(formData.get("snoozedUntil") ?? "") || undefined,
  })
  if (!parsed.success) return
  const resolved = await context()
  if (!resolved || !canManageCommercialTask(resolved.session.memberRole)) return
  const { data: task, error: readError } = await resolved.supabase
    .from("commercial_tasks")
    .select("id,status,lead_id,snoozed_until")
    .eq("id", parsed.data.taskId)
    .eq("garage_id", resolved.session.garageId)
    .maybeSingle()
  if (readError) throw new Error(`Lecture de la tâche impossible (${readError.code}).`)
  if (!task) return
  const effectiveStatus = resolveEffectiveTaskStatus({
    status: task.status as CommercialTaskStatus,
    snoozed_until: task.snoozed_until,
  }, new Date())
  if (!canTransitionCommercialTaskStatus(
    effectiveStatus,
    parsed.data.status
  )) return
  const now = new Date().toISOString()
  const { error } = await resolved.supabase
    .from("commercial_tasks")
    .update({
      status: parsed.data.status,
      completed_at: parsed.data.status === "COMPLETED" ? now : null,
      cancelled_at: parsed.data.status === "CANCELLED" ? now : null,
      snoozed_until: parsed.data.status === "SNOOZED" && parsed.data.snoozedUntil
        ? new Date(parsed.data.snoozedUntil).toISOString()
        : null,
    })
    .eq("id", task.id)
    .eq("garage_id", resolved.session.garageId)
    .eq("status", task.status)
  if (error) throw new Error(`Mise à jour de la tâche impossible (${error.code}).`)
  if (task.lead_id) {
    await persistEvent({
      leadId: task.lead_id,
      garageId: resolved.session.garageId,
      actorUserId: resolved.session.userId,
      eventType: parsed.data.status === "COMPLETED"
        ? "TASK_COMPLETED"
        : parsed.data.status === "SNOOZED"
          ? "TASK_SNOOZED"
          : "STATUS_CHANGED",
      metadata: { taskId: task.id, status: parsed.data.status, snoozedUntil: parsed.data.snoozedUntil },
    })
  }
  revalidateCommercial(task.lead_id ?? undefined)
}

export async function snoozeCommercialTask(formData: FormData): Promise<void> {
  const forwarded = new FormData()
  forwarded.set("taskId", String(formData.get("taskId") ?? ""))
  forwarded.set("status", "SNOOZED")
  forwarded.set("snoozedUntil", String(formData.get("snoozedUntil") ?? ""))
  await updateCommercialTaskStatus(forwarded)
}

export async function addLeadNote(formData: FormData): Promise<void> {
  const parsed = leadNoteSchema.safeParse({
    leadId: String(formData.get("leadId") ?? ""),
    content: String(formData.get("content") ?? ""),
  })
  if (!parsed.success) return
  const resolved = await context()
  if (!resolved) return
  const existingLead = await leadBelongsToGarage(parsed.data.leadId, resolved.session.garageId)
  if (!existingLead) return
  const { error } = await resolved.supabase.from("lead_notes").insert({
    garage_id: resolved.session.garageId,
    lead_id: parsed.data.leadId,
    author_user_id: resolved.session.userId,
    content: parsed.data.content,
  })
  if (error) throw new Error(`Ajout de la note impossible (${error.code}).`)
  await persistEvent({
    leadId: parsed.data.leadId,
    garageId: resolved.session.garageId,
    actorUserId: resolved.session.userId,
    eventType: "NOTE_ADDED",
  })
  revalidateCommercial(parsed.data.leadId)
}

export async function updateLeadNote(formData: FormData): Promise<void> {
  const parsed = leadNoteSchema.safeParse({
    leadId: String(formData.get("leadId") ?? ""),
    noteId: String(formData.get("noteId") ?? ""),
    content: String(formData.get("content") ?? ""),
  })
  if (!parsed.success || !parsed.data.noteId) return
  const resolved = await context()
  if (!resolved) return
  const { data: note } = await resolved.supabase
    .from("lead_notes")
    .select("id,author_user_id")
    .eq("id", parsed.data.noteId)
    .eq("lead_id", parsed.data.leadId)
    .eq("garage_id", resolved.session.garageId)
    .maybeSingle()
  if (!note || !canManageLeadNote(resolved.session.memberRole, note.author_user_id, resolved.session.userId)) return
  const { error } = await resolved.supabase
    .from("lead_notes")
    .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
    .eq("id", note.id)
    .eq("garage_id", resolved.session.garageId)
  if (error) throw new Error(`Mise à jour de la note impossible (${error.code}).`)
  revalidateCommercial(parsed.data.leadId)
}

export async function deleteLeadNote(formData: FormData): Promise<void> {
  const parsed = z.object({ leadId: z.uuid(), noteId: z.uuid() }).safeParse({
    leadId: String(formData.get("leadId") ?? ""),
    noteId: String(formData.get("noteId") ?? ""),
  })
  if (!parsed.success) return
  const resolved = await context()
  if (!resolved) return
  const { data: note } = await resolved.supabase
    .from("lead_notes")
    .select("id,author_user_id")
    .eq("id", parsed.data.noteId)
    .eq("lead_id", parsed.data.leadId)
    .eq("garage_id", resolved.session.garageId)
    .maybeSingle()
  if (!note || !canManageLeadNote(resolved.session.memberRole, note.author_user_id, resolved.session.userId)) return
  const { error } = await resolved.supabase
    .from("lead_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", note.id)
    .eq("garage_id", resolved.session.garageId)
  if (error) throw new Error(`Suppression de la note impossible (${error.code}).`)
  revalidateCommercial(parsed.data.leadId)
}

export async function logLeadCall(formData: FormData): Promise<void> {
  await logContact(formData, "CALL")
}

export async function logLeadEmail(formData: FormData): Promise<void> {
  await logContact(formData, "EMAIL")
}

async function logContact(formData: FormData, channel: "CALL" | "EMAIL") {
  const parsed = contactLogSchema.safeParse({
    leadId: String(formData.get("leadId") ?? ""),
    channel,
    outcome: String(formData.get("outcome") ?? (channel === "EMAIL" ? "SENT" : "")),
    note: String(formData.get("note") ?? "") || undefined,
    subject: String(formData.get("subject") ?? "") || undefined,
    nextActionAt: String(formData.get("nextActionAt") ?? "") || undefined,
  })
  if (!parsed.success) return
  const resolved = await context()
  if (!resolved) return
  const existingLead = await leadBelongsToGarage(parsed.data.leadId, resolved.session.garageId)
  if (!existingLead) return
  const now = new Date().toISOString()
  const { error } = await resolved.supabase
    .from("leads")
    .update({
      status: "CONTACTED",
      contacted_at: now,
      first_contacted_at: existingLead.first_contacted_at ?? now,
      last_contacted_at: now,
      next_action_at: parsed.data.nextActionAt
        ? new Date(parsed.data.nextActionAt).toISOString()
        : null,
    })
    .eq("id", parsed.data.leadId)
    .eq("garage_id", resolved.session.garageId)
  if (error) throw new Error(`Journalisation du contact impossible (${error.code}).`)
  await persistEvent({
    leadId: parsed.data.leadId,
    garageId: resolved.session.garageId,
    actorUserId: resolved.session.userId,
    eventType: channel === "CALL" ? "CALL_LOGGED" : "EMAIL_LOGGED",
    metadata: {
      outcome: parsed.data.outcome,
      note: parsed.data.note,
      subject: parsed.data.subject,
      nextActionAt: parsed.data.nextActionAt,
    },
  })
  revalidateCommercial(parsed.data.leadId)
}

export async function scheduleLeadFollowUp(formData: FormData): Promise<void> {
  const forwarded = new FormData()
  forwarded.set("leadId", String(formData.get("leadId") ?? ""))
  forwarded.set("type", String(formData.get("type") ?? "FOLLOW_UP"))
  forwarded.set("title", String(formData.get("title") ?? "Relancer le prospect"))
  forwarded.set("description", String(formData.get("note") ?? ""))
  forwarded.set("dueAt", String(formData.get("dueAt") ?? ""))
  forwarded.set("assignedUserId", String(formData.get("assignedUserId") ?? ""))
  await createCommercialTask(forwarded)
}

export async function closeCommercialLead(formData: FormData): Promise<void> {
  const parsed = closeLeadSchema.safeParse({
    leadId: String(formData.get("leadId") ?? ""),
    outcome: String(formData.get("outcome") ?? ""),
    lossReason: String(formData.get("lossReason") ?? "") || undefined,
    lossNote: String(formData.get("lossNote") ?? "") || undefined,
  })
  if (!parsed.success) return
  const resolved = await context()
  if (!resolved || !["owner", "admin"].includes(resolved.session.memberRole)) return
  if (!await leadBelongsToGarage(parsed.data.leadId, resolved.session.garageId)) return
  const now = new Date().toISOString()
  const { error } = await resolved.supabase
    .from("leads")
    .update({
      status: parsed.data.outcome,
      closed_at: now,
      next_action_at: null,
      loss_reason: parsed.data.outcome === "LOST" ? parsed.data.lossReason as LeadLossReason : null,
      loss_note: parsed.data.outcome === "LOST" ? parsed.data.lossNote ?? null : null,
    })
    .eq("id", parsed.data.leadId)
    .eq("garage_id", resolved.session.garageId)
  if (error) throw new Error(`Clôture du prospect impossible (${error.code}).`)
  const { error: taskError } = await resolved.supabase
    .from("commercial_tasks")
    .update({ status: "CANCELLED", cancelled_at: now })
    .eq("lead_id", parsed.data.leadId)
    .eq("garage_id", resolved.session.garageId)
    .in("status", ["OPEN", "IN_PROGRESS", "SNOOZED"])
  if (taskError) throw new Error(`Clôture des tâches impossible (${taskError.code}).`)
  await persistEvent({
    leadId: parsed.data.leadId,
    garageId: resolved.session.garageId,
    actorUserId: resolved.session.userId,
    eventType: parsed.data.outcome === "WON" ? "LEAD_WON" : "LEAD_LOST",
    metadata: parsed.data.outcome === "LOST"
      ? { lossReason: parsed.data.lossReason, lossNote: parsed.data.lossNote }
      : {},
  })
  if (parsed.data.outcome === "WON") await onLeadWon(parsed.data.leadId)
  revalidateCommercial(parsed.data.leadId)
}

export async function onLeadWon(leadId: string): Promise<void> {
  void leadId
}
