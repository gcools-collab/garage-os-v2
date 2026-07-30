import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import { revalidateVehicleLiveById } from "@/features/live-stock"
import { updateVehicleStatus } from "@/features/vehicles/status/vehicle-status-actions"
import type { CopilotActionLog, CopilotActionTargetSnapshot } from "../types"
import {
  changePricePayloadSchema,
  createTaskPayloadSchema,
  markContactedPayloadSchema,
} from "../validation"

export async function executeRegisteredCopilotAction(
  session: ActiveGarageSession,
  log: CopilotActionLog,
  currentTarget: CopilotActionTargetSnapshot
): Promise<string> {
  if (!session.garageId) throw new Error("COPILOT_ACTION_NO_GARAGE")
  const supabase = await createClient()
  if (log.action === "CHANGE_PRICE") {
    const payload = changePricePayloadSchema.parse(log.payload)
    const { data, error } = await supabase.from("vehicles").update({
      selling_price: payload.newPrice, updated_at: new Date().toISOString(),
    }).eq("id", currentTarget.id).eq("garage_id", session.garageId)
      .eq("updated_at", currentTarget.version).select("id").maybeSingle()
    if (error || !data) throw new Error("COPILOT_ACTION_TARGET_CHANGED")
    await supabase.from("vehicle_events").insert({
      vehicle_id: currentTarget.id,
      type: typeof currentTarget.currentPrice === "number" && payload.newPrice < currentTarget.currentPrice
        ? "PRICE_DROP"
        : "MODIFIED",
      description: `Prix de vente modifié : ${payload.newPrice.toLocaleString("fr-FR")} €`,
      metadata: {
        source: "COPILOT_APPROVAL",
        previous_price: currentTarget.currentPrice ?? null,
        new_price: payload.newPrice,
        changed_by: session.userId,
      },
    })
    await revalidateVehicleLiveById(currentTarget.id)
    return "Le prix de vente a été mis à jour."
  }
  if (log.action === "CHANGE_STATUS") {
    const nextStatus = String(log.payload.newStatus ?? "")
    const result = await updateVehicleStatus(currentTarget.id, nextStatus)
    if (!result.success) throw new Error(result.message)
    return result.message
  }
  if (log.action === "CREATE_TASK") {
    const payload = createTaskPayloadSchema.parse(log.payload)
    const { error } = await supabase.from("commercial_tasks").insert({
      garage_id: session.garageId,
      lead_id: currentTarget.type === "LEAD" ? currentTarget.id : currentTarget.leadId ?? null,
      vehicle_id: currentTarget.type === "VEHICLE" ? currentTarget.id : currentTarget.vehicleId ?? null,
      assigned_user_id: session.userId,
      created_by_user_id: session.userId,
      type: payload.type,
      status: "OPEN",
      priority: "NORMAL",
      title: payload.title,
      description: payload.description ?? null,
      due_at: payload.dueAt,
    })
    if (error) throw new Error(`COPILOT_ACTION_TASK_${error.code}`)
    return "La tâche commerciale a été créée."
  }
  if (log.action === "MARK_CONTACTED") {
    markContactedPayloadSchema.parse(log.payload)
    const now = new Date().toISOString()
    const { data, error } = await supabase.from("leads").update({
      first_contacted_at: currentTarget.firstContactedAt ?? now,
      last_contacted_at: now,
      status: "CONTACTED",
    }).eq("id", currentTarget.id).eq("garage_id", session.garageId)
      .eq("updated_at", currentTarget.version).select("id").maybeSingle()
    if (error || !data) throw new Error("COPILOT_ACTION_TARGET_CHANGED")
    await supabase.from("lead_events").insert({
      lead_id: currentTarget.id, garage_id: session.garageId,
      event_type: "CONTACTED", actor_user_id: session.userId,
      metadata: { source: "COPILOT_APPROVAL" },
    })
    return "Le prospect a été marqué comme contacté."
  }
  if (log.action === "OPEN_ENTITY") return "La fiche est prête à être ouverte."
  throw new Error("COPILOT_ACTION_UNSUPPORTED")
}

export async function notifyCopilotActionResult(
  session: ActiveGarageSession,
  log: CopilotActionLog,
  message: string
): Promise<void> {
  if (!session.garageId) return
  const supabase = await createClient()
  const entityType = log.targetType === "VEHICLE"
    ? "vehicle"
    : log.targetType === "LEAD"
      ? "lead"
      : "commercial_task"
  const { error } = await supabase.from("notifications").insert({
    garage_id: session.garageId, user_id: session.userId, type: "SYSTEM",
    title: "Action Copilote confirmée", message,
    href: log.targetSnapshot.href, entity_type: entityType, entity_id: log.targetId,
  })
  if (error) console.error("copilot_action_notification_failed", {
    operation: "notify_action_result", code: error.code, action: log.action,
  })
}
