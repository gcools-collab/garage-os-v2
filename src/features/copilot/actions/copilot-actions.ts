"use server"

import { revalidatePath } from "next/cache"

import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import { prepareCopilotActionProposals } from "@/features/copilot-actions/actions/prepare-actions"
import { defaultCopilotConfig } from "../config"
import {
  archiveCopilotConversationRecord,
  getCopilotConversation,
  getCopilotGarageContextSnapshot,
  getCopilotUsageCounts,
  insertCopilotConversation,
  insertCopilotMessage,
  updateCopilotConversationTitle,
} from "../data"
import {
  buildConversationTitle,
  resolveCopilotIntent,
  safeCopilotFallback,
  selectCopilotContext,
  serializeCopilotContext,
  validateCopilotGrounding,
} from "../engine"
import { buildCopilotMessageViewModel } from "../presentation"
import { buildCopilotSystemPrompt } from "../prompts"
import { createCopilotProvider } from "../providers"
import { detectCopilotInputRisk, sanitizeCopilotInput } from "../security"
import type { CopilotActionResult } from "../types"
import {
  CopilotConversationIdSchema,
  CopilotInputSchema,
  CopilotStructuredResponseSchema,
} from "../validation"

const RESPONSE_SCHEMA_DESCRIPTION = JSON.stringify({
  answer: "string",
  summary: "string|null",
  confidence: "HIGH|MEDIUM|LOW",
  dataStatus: "SUFFICIENT|PARTIAL|INSUFFICIENT",
  references: [{ entityType: "enum", entityId: "string", label: "string", href: "internal path" }],
  suggestedActions: [{ type: "enum", label: "string", href: "internal path", requiresConfirmation: false }],
  warnings: ["string"],
  followUpSuggestions: ["string"],
  actionProposals: [{
    action: "OPEN_ENTITY|CREATE_TASK|CHANGE_PRICE|CHANGE_STATUS|MARK_CONTACTED",
    targetId: "uuid",
    payload: {},
    explanation: "string",
    confidence: "LOW|MEDIUM|HIGH",
  }],
})

async function requireSession() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) throw new Error("COPILOT_UNAUTHORIZED")
  return session
}

export async function createCopilotConversation(): Promise<CopilotActionResult> {
  try {
    const conversation = await insertCopilotConversation(await requireSession(), null)
    revalidatePath("/copilot")
    return { success: true, conversationId: conversation.id }
  } catch {
    return { success: false, error: "Impossible de créer la conversation.", code: "CREATE_FAILED" }
  }
}

export async function sendCopilotMessage(input: unknown): Promise<CopilotActionResult> {
  const requestId = crypto.randomUUID()
  try {
    const parsed = CopilotInputSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Question invalide.", code: "INVALID_INPUT" }
    }
    const session = await requireSession()
    const conversation = await getCopilotConversation(session, parsed.data.conversationId)
    if (!conversation || conversation.conversation.status !== "ACTIVE") {
      return { success: false, error: "Conversation introuvable.", code: "NOT_FOUND" }
    }
    const message = sanitizeCopilotInput(parsed.data.message)
    const risk = detectCopilotInputRisk(message)
    if (risk.blocked) {
      await insertCopilotMessage(session, parsed.data.conversationId, {
        role: "USER", status: "BLOCKED", content: message,
      })
      return { success: false, error: risk.reason ?? "Demande refusée.", code: "BLOCKED" }
    }
    const usage = await getCopilotUsageCounts(session)
    if (
      usage.userHourly >= defaultCopilotConfig.hourlyUserRequestLimit
      || usage.garageDaily >= defaultCopilotConfig.dailyGarageRequestLimit
    ) {
      return {
        success: false,
        error: "Le Copilote a reçu beaucoup de demandes récemment. Réessayez dans quelques minutes.",
        code: "RATE_LIMITED",
      }
    }
    await insertCopilotMessage(session, parsed.data.conversationId, {
      role: "USER", status: "COMPLETED", content: message,
    })
    if (!conversation.conversation.title) {
      await updateCopilotConversationTitle(
        session,
        parsed.data.conversationId,
        buildConversationTitle(message)
      )
    }
    const intent = resolveCopilotIntent(message)
    if (intent.intent === "UNSUPPORTED") {
      const fallback = safeCopilotFallback(
        "Je suis le Copilote Garage OS. Je peux vous aider à analyser votre garage, votre stock et vos prospects."
      )
      const stored = await insertCopilotMessage(session, parsed.data.conversationId, {
        role: "ASSISTANT", status: "COMPLETED", content: fallback.answer, structuredPayload: fallback,
      })
      revalidatePath("/copilot")
      return {
        success: true,
        conversationId: parsed.data.conversationId,
        message: buildCopilotMessageViewModel(stored),
      }
    }
    const fullContext = await getCopilotGarageContextSnapshot(session)
    const selectedContext = selectCopilotContext(fullContext, intent.intent, defaultCopilotConfig)
    const recentMessages = conversation.messages
      .filter((item) => item.status === "COMPLETED" && item.role !== "SYSTEM")
      .slice(-defaultCopilotConfig.maxConversationMessages)
      .map((item) => ({
        role: item.role === "USER" ? "user" as const : "assistant" as const,
        content: item.content.slice(0, 2_000),
      }))
    const provider = createCopilotProvider(defaultCopilotConfig)
    const providerResult = await provider.generateResponse({
      systemPrompt: buildCopilotSystemPrompt(),
      messages: [...recentMessages, { role: "user", content: message }],
      context: serializeCopilotContext(selectedContext, defaultCopilotConfig.maxContextCharacters),
      responseSchema: RESPONSE_SCHEMA_DESCRIPTION,
      temperature: defaultCopilotConfig.temperature,
      maxTokens: defaultCopilotConfig.maxOutputTokens,
      timeoutMs: defaultCopilotConfig.timeoutMs,
    })
    const structured = CopilotStructuredResponseSchema.safeParse(providerResult.structuredResponse)
    const response = structured.success
      ? validateCopilotGrounding(structured.data, selectedContext)
      : safeCopilotFallback("Je n’ai pas pu vérifier la réponse produite. Vos données n’ont pas été modifiées.")
    const stored = await insertCopilotMessage(session, parsed.data.conversationId, {
      role: "ASSISTANT",
      status: structured.success ? "COMPLETED" : "FAILED",
      content: response.answer,
      structuredPayload: response,
      providerResult,
      errorCode: structured.success ? null : "INVALID_RESPONSE",
    })
    const actionProposals = structured.success
      ? await prepareCopilotActionProposals(
          session,
          parsed.data.conversationId,
          response.actionProposals
        )
      : []
    revalidatePath("/copilot")
    return {
      success: true,
      conversationId: parsed.data.conversationId,
      message: buildCopilotMessageViewModel(stored),
      actionProposals,
    }
  } catch (error) {
    console.error("copilot_request_failed", {
      requestId,
      operation: "send_message",
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    return {
      success: false,
      error: error instanceof Error && error.message === "COPILOT_PROVIDER_NOT_CONFIGURED"
        ? "Le fournisseur du Copilote n’est pas encore configuré."
        : "Je n’ai pas pu terminer l’analyse. Vos données n’ont pas été modifiées. Vous pouvez réessayer.",
      code: "PROVIDER_FAILED",
    }
  }
}

export async function retryCopilotMessage(conversationId: string): Promise<CopilotActionResult> {
  const parsed = CopilotConversationIdSchema.safeParse(conversationId)
  if (!parsed.success) return { success: false, error: "Conversation invalide.", code: "INVALID_INPUT" }
  const session = await requireSession()
  const conversation = await getCopilotConversation(session, parsed.data)
  const question = [...(conversation?.messages ?? [])].reverse().find((item) => item.role === "USER")
  if (!question) return { success: false, error: "Aucune question à réessayer.", code: "NOT_FOUND" }
  return sendCopilotMessage({ conversationId: parsed.data, message: question.content })
}

export async function archiveCopilotConversation(conversationId: string): Promise<CopilotActionResult> {
  const parsed = CopilotConversationIdSchema.safeParse(conversationId)
  if (!parsed.success) return { success: false, error: "Conversation invalide.", code: "INVALID_INPUT" }
  try {
    await archiveCopilotConversationRecord(await requireSession(), parsed.data)
    revalidatePath("/copilot")
    return { success: true, conversationId: parsed.data }
  } catch {
    return { success: false, error: "Archivage impossible.", code: "ARCHIVE_FAILED" }
  }
}

export async function startCopilotFromRecommendation(recommendationId: string): Promise<CopilotActionResult> {
  if (!recommendationId.trim()) return { success: false, error: "Recommandation invalide.", code: "INVALID_INPUT" }
  const session = await requireSession()
  const supabase = await createClient()
  const { data } = await supabase.from("intelligence_recommendations").select("id")
    .eq("garage_id", session.garageId).eq("recommendation_key", recommendationId).maybeSingle()
  if (!data) return { success: false, error: "Recommandation introuvable.", code: "NOT_FOUND" }
  const conversation = await insertCopilotConversation(session, "Explication d’une recommandation")
  return { success: true, conversationId: conversation.id }
}

export async function startCopilotFromVehicle(vehicleId: string): Promise<CopilotActionResult> {
  if (!CopilotConversationIdSchema.safeParse(vehicleId).success) {
    return { success: false, error: "Véhicule invalide.", code: "INVALID_INPUT" }
  }
  const session = await requireSession()
  const supabase = await createClient()
  const { data } = await supabase.from("vehicles").select("id")
    .eq("garage_id", session.garageId).eq("id", vehicleId).maybeSingle()
  if (!data) return { success: false, error: "Véhicule introuvable.", code: "NOT_FOUND" }
  const conversation = await insertCopilotConversation(session, "Analyse d’un véhicule")
  return { success: true, conversationId: conversation.id }
}

export async function startCopilotFromLead(leadId: string): Promise<CopilotActionResult> {
  if (!CopilotConversationIdSchema.safeParse(leadId).success) {
    return { success: false, error: "Prospect invalide.", code: "INVALID_INPUT" }
  }
  const session = await requireSession()
  const supabase = await createClient()
  const { data } = await supabase.from("leads").select("id")
    .eq("garage_id", session.garageId).eq("id", leadId).maybeSingle()
  if (!data) return { success: false, error: "Prospect introuvable.", code: "NOT_FOUND" }
  const conversation = await insertCopilotConversation(session, "Analyse d’un prospect")
  return { success: true, conversationId: conversation.id }
}
