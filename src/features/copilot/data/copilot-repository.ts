import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type {
  CopilotConversation,
  CopilotMessage,
  CopilotMessageStatus,
  CopilotProviderResult,
  CopilotStructuredResponse,
} from "../types"

type ConversationRow = {
  readonly id: string
  readonly garage_id: string
  readonly created_by_user_id: string
  readonly title: string | null
  readonly status: "ACTIVE" | "ARCHIVED"
  readonly last_message_at: string | null
  readonly created_at: string
}

type MessageRow = {
  readonly id: string
  readonly conversation_id: string
  readonly role: "USER" | "ASSISTANT" | "SYSTEM"
  readonly status: CopilotMessageStatus
  readonly content: string
  readonly structured_payload: CopilotStructuredResponse | null
  readonly created_at: string
}

const CONVERSATION_COLUMNS =
  "id,garage_id,created_by_user_id,title,status,last_message_at,created_at"
const MESSAGE_COLUMNS =
  "id,conversation_id,role,status,content,structured_payload,created_at"

function mapConversation(row: ConversationRow): CopilotConversation {
  return {
    id: row.id,
    garageId: row.garage_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    status: row.status,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
  }
}

function mapMessage(row: MessageRow): CopilotMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    status: row.status,
    content: row.content,
    structuredPayload: row.structured_payload,
    createdAt: row.created_at,
  }
}

function requireScope(session: ActiveGarageSession): {
  readonly garageId: string
  readonly userId: string
} {
  if (!session.garageId) throw new Error("COPILOT_NO_ACTIVE_GARAGE")
  return { garageId: session.garageId, userId: session.userId }
}

export async function listCopilotConversations(
  session: ActiveGarageSession
): Promise<readonly CopilotConversation[]> {
  const { garageId, userId } = requireScope(session)
  const supabase = await createClient()
  const { data, error } = await supabase.from("copilot_conversations")
    .select(CONVERSATION_COLUMNS)
    .eq("garage_id", garageId)
    .eq("created_by_user_id", userId)
    .eq("status", "ACTIVE")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(20)
  if (error) throw new Error(`COPILOT_CONVERSATIONS_READ_${error.code}`)
  return ((data ?? []) as unknown as ConversationRow[]).map(mapConversation)
}

export async function getCopilotConversation(
  session: ActiveGarageSession,
  conversationId: string
): Promise<{ readonly conversation: CopilotConversation; readonly messages: readonly CopilotMessage[] } | null> {
  const { garageId, userId } = requireScope(session)
  const supabase = await createClient()
  const { data, error } = await supabase.from("copilot_conversations")
    .select(CONVERSATION_COLUMNS)
    .eq("id", conversationId)
    .eq("garage_id", garageId)
    .eq("created_by_user_id", userId)
    .maybeSingle()
  if (error) throw new Error(`COPILOT_CONVERSATION_READ_${error.code}`)
  if (!data) return null
  const { data: messages, error: messageError } = await supabase.from("copilot_messages")
    .select(MESSAGE_COLUMNS)
    .eq("garage_id", garageId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100)
  if (messageError) throw new Error(`COPILOT_MESSAGES_READ_${messageError.code}`)
  return {
    conversation: mapConversation(data as unknown as ConversationRow),
    messages: ((messages ?? []) as unknown as MessageRow[]).map(mapMessage),
  }
}

export async function insertCopilotConversation(
  session: ActiveGarageSession,
  title: string | null
): Promise<CopilotConversation> {
  const { garageId, userId } = requireScope(session)
  const supabase = await createClient()
  const { data, error } = await supabase.from("copilot_conversations").insert({
    garage_id: garageId,
    created_by_user_id: userId,
    title,
    status: "ACTIVE",
  }).select(CONVERSATION_COLUMNS).single()
  if (error) throw new Error(`COPILOT_CONVERSATION_CREATE_${error.code}`)
  return mapConversation(data as unknown as ConversationRow)
}

export async function updateCopilotConversationTitle(
  session: ActiveGarageSession,
  conversationId: string,
  title: string
): Promise<void> {
  const { garageId, userId } = requireScope(session)
  const supabase = await createClient()
  const { error } = await supabase.from("copilot_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("garage_id", garageId)
    .eq("created_by_user_id", userId)
    .is("title", null)
  if (error) throw new Error(`COPILOT_CONVERSATION_TITLE_${error.code}`)
}

export async function insertCopilotMessage(
  session: ActiveGarageSession,
  conversationId: string,
  input: {
    readonly role: "USER" | "ASSISTANT"
    readonly status: CopilotMessageStatus
    readonly content: string
    readonly structuredPayload?: CopilotStructuredResponse | null
    readonly providerResult?: CopilotProviderResult
    readonly errorCode?: string | null
  }
): Promise<CopilotMessage> {
  const { garageId, userId } = requireScope(session)
  const supabase = await createClient()
  const { data, error } = await supabase.from("copilot_messages").insert({
    garage_id: garageId,
    conversation_id: conversationId,
    user_id: input.role === "USER" ? userId : null,
    role: input.role,
    status: input.status,
    content: input.content,
    structured_payload: input.structuredPayload ?? null,
    provider: input.providerResult?.provider ?? null,
    model: input.providerResult?.model ?? null,
    input_tokens: input.providerResult?.usage.inputTokens ?? null,
    output_tokens: input.providerResult?.usage.outputTokens ?? null,
    latency_ms: input.providerResult?.latencyMs ?? null,
    error_code: input.errorCode ?? null,
  }).select(MESSAGE_COLUMNS).single()
  if (error) throw new Error(`COPILOT_MESSAGE_CREATE_${error.code}`)
  await supabase.from("copilot_conversations").update({
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", conversationId).eq("garage_id", garageId).eq("created_by_user_id", userId)
  return mapMessage(data as unknown as MessageRow)
}

export async function archiveCopilotConversationRecord(
  session: ActiveGarageSession,
  conversationId: string
): Promise<void> {
  const { garageId, userId } = requireScope(session)
  const supabase = await createClient()
  const { error } = await supabase.from("copilot_conversations").update({
    status: "ARCHIVED", archived_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", conversationId).eq("garage_id", garageId).eq("created_by_user_id", userId)
  if (error) throw new Error(`COPILOT_CONVERSATION_ARCHIVE_${error.code}`)
}

export async function getCopilotUsageCounts(
  session: ActiveGarageSession,
  now = new Date()
): Promise<{ readonly userHourly: number; readonly garageDaily: number }> {
  const { garageId, userId } = requireScope(session)
  const supabase = await createClient()
  const hour = new Date(now.getTime() - 60 * 60 * 1_000).toISOString()
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1_000).toISOString()
  const [userResult, garageResult] = await Promise.all([
    supabase.from("copilot_messages").select("id", { count: "exact", head: true })
      .eq("garage_id", garageId).eq("user_id", userId).eq("role", "USER").gte("created_at", hour),
    supabase.from("copilot_messages").select("id", { count: "exact", head: true })
      .eq("garage_id", garageId).eq("role", "USER").gte("created_at", day),
  ])
  if (userResult.error || garageResult.error) throw new Error("COPILOT_USAGE_READ_FAILED")
  return { userHourly: userResult.count ?? 0, garageDaily: garageResult.count ?? 0 }
}
