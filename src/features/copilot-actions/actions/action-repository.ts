import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type {
  CopilotActionLog,
  CopilotActionProposalInput,
  CopilotActionStatus,
  CopilotActionTargetSnapshot,
  CopilotActionTargetType,
} from "../types"

type ActionLogRow = {
  readonly id: string
  readonly garage_id: string
  readonly user_id: string
  readonly conversation_id: string
  readonly action: CopilotActionLog["action"]
  readonly target_type: CopilotActionTargetType
  readonly target_id: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly target_snapshot: CopilotActionTargetSnapshot
  readonly explanation: string
  readonly confidence: CopilotActionLog["confidence"]
  readonly status: CopilotActionStatus
  readonly created_at: string
  readonly resolved_at: string | null
}

const LOG_COLUMNS = [
  "id", "garage_id", "user_id", "conversation_id", "action", "target_type",
  "target_id", "payload", "target_snapshot", "explanation", "confidence",
  "status", "created_at", "resolved_at",
].join(",")

function mapLog(row: ActionLogRow): CopilotActionLog {
  return {
    id: row.id, garageId: row.garage_id, userId: row.user_id,
    conversationId: row.conversation_id, action: row.action,
    targetType: row.target_type, targetId: row.target_id, payload: row.payload,
    targetSnapshot: row.target_snapshot, explanation: row.explanation,
    confidence: row.confidence, status: row.status,
    createdAt: row.created_at, resolvedAt: row.resolved_at,
  }
}

export async function loadCopilotActionTarget(
  session: ActiveGarageSession,
  targetId: string,
  expectedType?: CopilotActionTargetType
): Promise<CopilotActionTargetSnapshot | null> {
  if (!session.garageId) return null
  const supabase = await createClient()
  if (!expectedType || expectedType === "VEHICLE") {
    const { data } = await supabase.from("vehicles")
      .select("id,garage_id,brand,model,selling_price,status,updated_at")
      .eq("id", targetId).eq("garage_id", session.garageId).maybeSingle()
    if (data) return {
      id: data.id, garageId: data.garage_id, type: "VEHICLE",
      label: `${data.brand} ${data.model}`, href: `/stock/${data.id}`,
      version: data.updated_at, currentPrice: data.selling_price === null ? null : Number(data.selling_price),
      currentStatus: data.status,
    }
  }
  if (!expectedType || expectedType === "LEAD") {
    const { data } = await supabase.from("leads")
      .select("id,garage_id,customer_name,vehicle_id,status,first_contacted_at,updated_at")
      .eq("id", targetId).eq("garage_id", session.garageId).maybeSingle()
    if (data) return {
      id: data.id, garageId: data.garage_id, type: "LEAD",
      label: data.customer_name, href: `/leads/${data.id}`,
      version: data.updated_at, firstContactedAt: data.first_contacted_at,
      vehicleId: data.vehicle_id, currentStatus: data.status,
    }
  }
  if (!expectedType || expectedType === "COMMERCIAL_TASK") {
    const { data } = await supabase.from("commercial_tasks")
      .select("id,garage_id,title,lead_id,vehicle_id,updated_at")
      .eq("id", targetId).eq("garage_id", session.garageId).maybeSingle()
    if (data) return {
      id: data.id, garageId: data.garage_id, type: "COMMERCIAL_TASK",
      label: data.title, href: data.lead_id ? `/leads/${data.lead_id}` : "/commercial",
      version: data.updated_at, leadId: data.lead_id, vehicleId: data.vehicle_id,
    }
  }
  return null
}

export async function insertCopilotActionLog(
  session: ActiveGarageSession,
  conversationId: string,
  proposal: CopilotActionProposalInput,
  target: CopilotActionTargetSnapshot,
  payload: Readonly<Record<string, unknown>>
): Promise<CopilotActionLog> {
  if (!session.garageId) throw new Error("COPILOT_ACTION_NO_GARAGE")
  const supabase = await createClient()
  const { data, error } = await supabase.from("copilot_action_logs").insert({
    garage_id: session.garageId,
    user_id: session.userId,
    conversation_id: conversationId,
    action: proposal.action,
    target_type: target.type,
    target_id: target.id,
    payload,
    target_snapshot: target,
    explanation: proposal.explanation,
    confidence: proposal.confidence,
    status: "PROPOSED",
  }).select(LOG_COLUMNS).single()
  if (error) throw new Error(`COPILOT_ACTION_LOG_CREATE_${error.code}`)
  return mapLog(data as unknown as ActionLogRow)
}

export async function listCopilotActionLogs(
  session: ActiveGarageSession,
  conversationId: string
): Promise<readonly CopilotActionLog[]> {
  if (!session.garageId) return []
  const supabase = await createClient()
  const { data, error } = await supabase.from("copilot_action_logs").select(LOG_COLUMNS)
    .eq("garage_id", session.garageId).eq("user_id", session.userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true }).limit(50)
  if (error) throw new Error(`COPILOT_ACTION_LOG_READ_${error.code}`)
  return ((data ?? []) as unknown as ActionLogRow[]).map(mapLog)
}

export async function getCopilotActionLog(
  session: ActiveGarageSession,
  proposalId: string
): Promise<CopilotActionLog | null> {
  if (!session.garageId) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from("copilot_action_logs").select(LOG_COLUMNS)
    .eq("id", proposalId).eq("garage_id", session.garageId).eq("user_id", session.userId)
    .maybeSingle()
  if (error) throw new Error(`COPILOT_ACTION_LOG_READ_${error.code}`)
  return data ? mapLog(data as unknown as ActionLogRow) : null
}

export async function resolveCopilotActionLog(
  session: ActiveGarageSession,
  proposalId: string,
  status: Exclude<CopilotActionStatus, "PROPOSED">,
  resultMessage: string
): Promise<CopilotActionLog> {
  if (!session.garageId) throw new Error("COPILOT_ACTION_NO_GARAGE")
  const supabase = await createClient()
  const { data, error } = await supabase.from("copilot_action_logs").update({
    status, resolved_at: new Date().toISOString(), result_message: resultMessage,
  }).eq("id", proposalId).eq("garage_id", session.garageId)
    .eq("user_id", session.userId).eq("status", "PROPOSED")
    .select(LOG_COLUMNS).maybeSingle()
  if (error || !data) throw new Error("COPILOT_ACTION_ALREADY_RESOLVED")
  return mapLog(data as unknown as ActionLogRow)
}
