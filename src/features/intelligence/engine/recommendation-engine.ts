import type { GarageIntelligenceConfig } from "../config"
import type {
  GarageIntelligenceSnapshot, GarageRecommendation, GarageRecommendationType,
  IntelligenceRecommendationStatus, IntelligenceSignal,
  IntelligenceSignalCategory, RecommendationConfidence,
  RecommendationImpact, RecommendationUrgency,
} from "../types"
import { computePriceRecommendation } from "./price-recommendation"

const impactPoints: Readonly<Record<RecommendationImpact, number>> = {
  VERY_HIGH: 35, HIGH: 28, MEDIUM: 18, LOW: 8,
}
const urgencyPoints: Readonly<Record<RecommendationUrgency, number>> = {
  IMMEDIATE: 30, TODAY: 24, SOON: 14, WHEN_POSSIBLE: 5,
}
const confidencePoints: Readonly<Record<RecommendationConfidence, number>> = {
  HIGH: 20, MEDIUM: 13, LOW: 5,
}
const effortPenalty = { VERY_LOW: -2, LOW: -5, MEDIUM: -9, HIGH: -15 } as const
const categoryBonus: Readonly<Record<IntelligenceSignalCategory, number>> = {
  APPOINTMENT: 14, COMMERCIAL: 12, PRICING: 7, PROFITABILITY: 6,
  PUBLICATION: 5, STOCK: 4, ACQUISITION: 1, DATA_QUALITY: 0,
}

type RecommendationConcern =
  | "contact" | "follow-up" | "appointment" | "task" | "pricing"
  | "publication" | "aging" | "margin" | "availability" | "acquisition"

export function buildRecommendationKey(input: {
  readonly entityType: IntelligenceSignal["entityType"]
  readonly entityId: string
  readonly concern: RecommendationConcern
}) {
  return `${input.entityType}:${input.entityId}:${input.concern}`
}

function concern(signal: IntelligenceSignal): RecommendationConcern {
  if (signal.type === "LEAD_UNCONTACTED") return "contact"
  if (signal.type === "APPOINTMENT_UNCONFIRMED") return "appointment"
  if (signal.type === "ACTIVE_LEAD_VEHICLE_UNAVAILABLE") return "availability"
  if (signal.type === "COMMERCIAL_TASK_OVERDUE") return "task"
  if (["VEHICLE_ABOVE_MARKET", "PRICE_NOT_REVIEWED"].includes(signal.type)) return "pricing"
  if (["READY_NOT_PUBLISHED", "MISSING_PHOTOS", "MISSING_DESCRIPTION", "INCOMPLETE_PUBLICATION"].includes(signal.type)) return "publication"
  if (["VEHICLE_AGING", "VEHICLE_STAGNATING", "HIGH_CAPITAL_IMMOBILIZATION"].includes(signal.type)) return "aging"
  if (["LOW_ESTIMATED_MARGIN", "MARGIN_AT_RISK", "PREPARATION_COST_TOO_HIGH"].includes(signal.type)) return "margin"
  if (signal.category === "ACQUISITION") return "acquisition"
  return "follow-up"
}

export function groupRelatedSignals(signals: readonly IntelligenceSignal[]) {
  const groups = new Map<string, IntelligenceSignal[]>()
  for (const item of signals) {
    if (item.type === "LOW_MARKET_CONFIDENCE") continue
    const key = buildRecommendationKey({
      entityType: item.entityType, entityId: item.entityId, concern: concern(item),
    })
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([recommendationKey, grouped]) => ({
      recommendationKey, signals: grouped as readonly IntelligenceSignal[],
    }))
}

function definition(kind: RecommendationConcern, item: IntelligenceSignal): {
  readonly type: GarageRecommendationType
  readonly action: string
  readonly impact: RecommendationImpact
  readonly urgency: RecommendationUrgency
  readonly confidence: RecommendationConfidence
  readonly href: string
} {
  if (kind === "contact") return { type: "CONTACT_LEAD", action: `Rappeler ${item.title}`, impact: "VERY_HIGH", urgency: item.severity === "CRITICAL" ? "IMMEDIATE" : "TODAY", confidence: "HIGH", href: `/leads/${item.entityId}` }
  if (kind === "appointment") return { type: "CONFIRM_APPOINTMENT", action: `Confirmer le rendez-vous de ${item.title}`, impact: "VERY_HIGH", urgency: "IMMEDIATE", confidence: "HIGH", href: `/leads/${item.entityId}` }
  if (kind === "availability") return { type: "VERIFY_VEHICLE_AVAILABILITY", action: `Vérifier la disponibilité pour ${item.title}`, impact: "HIGH", urgency: "TODAY", confidence: "HIGH", href: `/leads/${item.entityId}` }
  if (kind === "task") return { type: "COMPLETE_TASK", action: item.title, impact: "HIGH", urgency: "IMMEDIATE", confidence: "HIGH", href: typeof item.facts.leadId === "string" ? `/leads/${item.facts.leadId}` : "/commercial" }
  if (kind === "pricing") return { type: "REVIEW_VEHICLE_PRICE", action: `Revoir le prix de ${item.title}`, impact: "HIGH", urgency: "TODAY", confidence: "MEDIUM", href: `/stock/${item.entityId}` }
  if (kind === "publication") return { type: item.type === "READY_NOT_PUBLISHED" ? "PUBLISH_VEHICLE" : "COMPLETE_VEHICLE_LISTING", action: item.type === "READY_NOT_PUBLISHED" ? `Publier ${item.title}` : `Compléter la fiche de ${item.title}`, impact: "HIGH", urgency: "SOON", confidence: "HIGH", href: `/stock/${item.entityId}` }
  if (kind === "aging") return { type: "REVIEW_AGING_VEHICLE", action: `Réexaminer ${item.title}`, impact: item.type === "HIGH_CAPITAL_IMMOBILIZATION" ? "VERY_HIGH" : "HIGH", urgency: "SOON", confidence: "HIGH", href: `/stock/${item.entityId}` }
  if (kind === "margin") return { type: "REVIEW_LOW_MARGIN_VEHICLE", action: `Vérifier la rentabilité de ${item.title}`, impact: "HIGH", urgency: "SOON", confidence: "HIGH", href: `/stock/${item.entityId}` }
  if (kind === "acquisition") return { type: "REVIEW_ACQUISITION_OPPORTUNITY", action: `Étudier ${item.title}`, impact: "HIGH", urgency: "SOON", confidence: "MEDIUM", href: "/buying" }
  return { type: "FOLLOW_UP_LEAD", action: item.title, impact: "MEDIUM", urgency: "SOON", confidence: "MEDIUM", href: "/commercial" }
}

function evidence(item: IntelligenceSignal) {
  return Object.entries(item.facts).flatMap(([key, value]) => {
    if (value === null || typeof value === "boolean") return []
    if (key === "ageHours") return [`Sans contact depuis ${value} h`]
    if (key === "overdueMinutes") return [`Échéance dépassée de ${value} min`]
    if (key === "daysInStock") return [`En stock depuis ${value} jours`]
    if (key === "daysPublished") return [`Publié depuis ${value} jours`]
    if (key === "comparableCount") return [`${value} annonces comparables`]
    if (key === "priceDifferencePercent") return [`Écart au marché : ${Math.round(Number(value))} %`]
    if (key === "completenessScore") return [`Fiche complète à ${value} %`]
    if (key === "vehicleTitle") return [`Véhicule : ${value}`]
    return []
  })
}

function persistedStatus(
  previous: GarageIntelligenceSnapshot["previousRecommendations"][number] | undefined,
  now: Date
): { readonly status: IntelligenceRecommendationStatus; readonly snoozedUntil: string | null } {
  if (!previous) return { status: "ACTIVE", snoozedUntil: null }
  if (previous.status === "SNOOZED" && previous.snoozedUntil && Date.parse(previous.snoozedUntil) > now.getTime()) {
    return { status: "SNOOZED", snoozedUntil: previous.snoozedUntil }
  }
  if (previous.status === "DISMISSED" && previous.dismissedAt && now.getTime() - Date.parse(previous.dismissedAt) < 7 * 86_400_000) {
    return { status: "DISMISSED", snoozedUntil: null }
  }
  return { status: "ACTIVE", snoozedUntil: null }
}

export function rankGarageRecommendations(
  items: readonly Omit<GarageRecommendation, "score" | "scoreBreakdown">[]
): readonly GarageRecommendation[] {
  return items.map((item) => {
    const agingDays = item.evidence.reduce((max, proof) => {
      const match = proof.match(/(\d+) jours/)
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    const scoreBreakdown = {
      impact: impactPoints[item.impact],
      urgency: urgencyPoints[item.urgency],
      confidence: confidencePoints[item.confidence],
      effortPenalty: effortPenalty[item.effort],
      agingBonus: Math.min(10, Math.floor(agingDays / 15)),
      categoryBonus: categoryBonus[item.category],
    }
    return {
      ...item,
      score: Math.max(0, Math.min(100, Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0))),
      scoreBreakdown,
    }
  }).sort((a, b) => b.score - a.score || a.recommendationKey.localeCompare(b.recommendationKey))
}

export function buildRecommendationsFromSignals(
  signals: readonly IntelligenceSignal[],
  snapshot: GarageIntelligenceSnapshot,
  config: GarageIntelligenceConfig,
  now: Date
): readonly GarageRecommendation[] {
  const drafts = groupRelatedSignals(signals).map(({ recommendationKey, signals: related }) => {
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    const primary = [...related].sort((a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id))[0] as IntelligenceSignal
    const kind = concern(primary)
    const base = definition(kind, primary)
    const effort = config.effortDurations[base.type]
    const state = persistedStatus(snapshot.previousRecommendations.find((item) => item.recommendationKey === recommendationKey), now)
    const vehicle = primary.entityType === "vehicle" ? snapshot.vehicles.find((item) => item.id === primary.entityId) : null
    const price = kind === "pricing" && vehicle?.priceCents !== null
      ? computePriceRecommendation({
        currentPriceCents: vehicle?.priceCents ?? 0,
        medianPriceCents: vehicle?.marketPosition?.medianPriceCents ?? null,
        averagePriceCents: vehicle?.marketPosition?.averagePriceCents ?? null,
        comparableCount: vehicle?.marketPosition?.comparableCount ?? 0,
        stockAgeDays: vehicle?.daysInStock ?? 0,
        capitalInvestedCents: vehicle?.capitalInvestedCents ?? null,
        minimumMarginCents: config.minimumEstimatedMarginCents,
        confidence: vehicle?.marketPosition?.confidence ?? "LOW",
        config,
      }) : null
    const proofs = [...new Set(related.flatMap(evidence))]
    if (price?.suggestedPriceCents !== null && price?.suggestedPriceCents !== undefined) proofs.push(`Prix suggéré calculé : ${price.suggestedPriceCents} centimes`)
    return {
      recommendationKey,
      type: price?.kind === "REDUCE" ? "REDUCE_VEHICLE_PRICE" as const : base.type,
      category: primary.category,
      entityType: primary.entityType,
      entityId: primary.entityId,
      action: base.action,
      subject: primary.title,
      impact: base.impact,
      urgency: base.urgency,
      effort: effort.effort,
      effortMinutes: effort.minutes,
      confidence: price?.confidence ?? base.confidence,
      reasons: related.map((item) => item.title),
      evidence: proofs,
      href: base.href,
      createdAt: now.toISOString(),
      expiresAt: null,
      sourceSignalIds: related.map((item) => item.id),
      status: state.status,
      snoozedUntil: state.snoozedUntil,
    }
  })
  return rankGarageRecommendations(drafts)
}

export function deduplicateRecommendations(items: readonly GarageRecommendation[]) {
  return [...new Map(items.map((item) => [item.recommendationKey, item])).values()]
}
