import type {
  CopilotGarageContextSnapshot,
  CopilotIntent,
  CopilotReference,
  CopilotStructuredResponse,
} from "../types"
import { isAllowedCopilotHref } from "../security"

export function buildConversationTitle(question: string): string {
  const normalized = question.replace(/\s+/g, " ").trim()
  if (/priorit|aujourd/i.test(normalized)) return "Priorités du jour"
  if (/prospect|lead|commercial/i.test(normalized)) return "Situation commerciale"
  if (/prix|marché/i.test(normalized)) return "Analyse des prix"
  return normalized.slice(0, 60) || "Nouvelle conversation"
}

export function buildCopilotSuggestions(intent?: CopilotIntent): readonly string[] {
  if (intent === "COMMERCIAL_OVERVIEW") {
    return ["Quel prospect est le plus urgent ?", "Quels rendez-vous dois-je confirmer ?"]
  }
  if (intent === "STOCK_OVERVIEW" || intent === "VEHICLE_ANALYSIS") {
    return ["Quel véhicule immobilise le plus de capital ?", "Quels véhicules manquent de photos ?"]
  }
  return [
    "Que dois-je faire aujourd’hui ?",
    "Résume-moi l’activité commerciale.",
    "Quels véhicules stagnent ?",
    "Où se trouve le capital immobilisé ?",
  ]
}

function allowedReferences(snapshot: CopilotGarageContextSnapshot): readonly CopilotReference[] {
  return [
    ...snapshot.selectedEntities.vehicles.map((item) => ({
      entityType: "VEHICLE" as const, entityId: item.id, label: item.title, href: item.dashboardUrl,
    })),
    ...snapshot.selectedEntities.leads.map((item) => ({
      entityType: "LEAD" as const, entityId: item.id, label: item.customerName, href: item.href,
    })),
    ...snapshot.selectedEntities.tasks.map((item) => ({
      entityType: "COMMERCIAL_TASK" as const, entityId: item.id, label: item.title, href: item.href,
    })),
    ...snapshot.selectedEntities.recommendations.map((item) => ({
      entityType: "RECOMMENDATION" as const,
      entityId: item.recommendationKey,
      label: item.action,
      href: "/intelligence",
    })),
  ]
}

export function validateCopilotGrounding(
  response: CopilotStructuredResponse,
  snapshot: CopilotGarageContextSnapshot
): CopilotStructuredResponse {
  const allowed = new Map(allowedReferences(snapshot).map((reference) => [
    `${reference.entityType}:${reference.entityId}`, reference,
  ]))
  const allowedEntityHrefs = new Set([...allowed.values()].map((reference) => reference.href))
  const allowedStaticHrefs = new Set([
    "/commercial", "/intelligence", "/notifications", "/buying", "/settings",
    "/settings/branding",
  ])
  const references = response.references
    .map((item) => allowed.get(`${item.entityType}:${item.entityId}`))
    .filter((item): item is CopilotReference => Boolean(item))
  const suggestedActions = response.suggestedActions
    .filter((item) =>
      isAllowedCopilotHref(item.href)
      && (allowedEntityHrefs.has(item.href) || allowedStaticHrefs.has(item.href))
    )
    .map((item) => ({ ...item, requiresConfirmation: false }))
  return {
    ...response,
    references,
    suggestedActions,
    warnings: references.length < response.references.length
      ? [...response.warnings, "Certaines références non vérifiables ont été retirées."]
      : response.warnings,
  }
}

export function safeCopilotFallback(message: string): CopilotStructuredResponse {
  return {
    answer: message,
    summary: null,
    confidence: "LOW",
    dataStatus: "INSUFFICIENT",
    references: [],
    suggestedActions: [],
    warnings: [],
    followUpSuggestions: buildCopilotSuggestions(),
    actionProposals: [],
  }
}
