"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getActiveGarageSession } from "@/features/tenant"
import { canManageLead, canTransitionLeadStatus } from "../engine"
import { LEAD_STATUSES, type LeadStatus } from "../types"

const schema = z.object({
  leadId: z.uuid(),
  nextStatus: z.enum(LEAD_STATUSES),
})

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    leadId: String(formData.get("leadId") ?? ""),
    nextStatus: String(formData.get("nextStatus") ?? ""),
  })
  if (!parsed.success) return
  const session = await getActiveGarageSession()
  if (!session?.garageId || !canManageLead(session.memberRole, parsed.data.nextStatus === "ARCHIVED" ? "archive" : "status")) return
  const supabase = await createClient()
  const { data: lead } = await supabase
    .from("leads")
    .select("id,status,garage_id")
    .eq("id", parsed.data.leadId)
    .eq("garage_id", session.garageId)
    .maybeSingle()
  if (!lead || !LEAD_STATUSES.includes(lead.status as LeadStatus)) return
  const currentStatus = lead.status as LeadStatus
  if (!canTransitionLeadStatus(currentStatus, parsed.data.nextStatus)) return
  const now = new Date().toISOString()
  const timestamps = {
    contacted_at: ["CONTACTED", "APPOINTMENT_PLANNED"].includes(parsed.data.nextStatus) ? now : undefined,
    closed_at: ["LOST", "WON"].includes(parsed.data.nextStatus) ? now : undefined,
    archived_at: parsed.data.nextStatus === "ARCHIVED" ? now : undefined,
  }
  const { error } = await supabase
    .from("leads")
    .update({ status: parsed.data.nextStatus, ...timestamps })
    .eq("id", parsed.data.leadId)
    .eq("garage_id", session.garageId)
    .eq("status", currentStatus)
  if (error) throw new Error(`Mise à jour du lead impossible (${error.code}).`)
  const eventType = parsed.data.nextStatus === "CONTACTED"
    ? "CONTACTED"
    : parsed.data.nextStatus === "APPOINTMENT_PLANNED"
      ? "APPOINTMENT_PLANNED"
      : parsed.data.nextStatus === "ARCHIVED"
        ? "ARCHIVED"
        : "STATUS_CHANGED"
  const { error: eventError } = await supabase.from("lead_events").insert({
    lead_id: parsed.data.leadId,
    garage_id: session.garageId,
    event_type: eventType,
    from_status: currentStatus,
    to_status: parsed.data.nextStatus,
    actor_user_id: session.userId,
  })
  if (eventError) {
    console.error("Lead event persistence failed", {
      operation: "updateLeadStatus",
      code: eventError.code,
      leadId: parsed.data.leadId,
    })
  }
  revalidatePath("/leads")
  revalidatePath(`/leads/${parsed.data.leadId}`)
  revalidatePath("/dashboard")
}
