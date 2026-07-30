import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import { defaultGarageIntelligenceConfig } from "../config"
import {
  buildGarageIntelligenceBrief,
  buildGarageIntelligenceSnapshot,
  type GarageIntelligenceBrief,
} from "../engine"
import type { GarageRecommendation } from "../types"
import { getGarageIntelligenceSourceData } from "./garage-intelligence-repository"

function payload(recommendation: GarageRecommendation) {
  return {
    action: recommendation.action,
    subject: recommendation.subject,
    impact: recommendation.impact,
    urgency: recommendation.urgency,
    effort: recommendation.effort,
    effortMinutes: recommendation.effortMinutes,
    confidence: recommendation.confidence,
    reasons: recommendation.reasons,
    evidence: recommendation.evidence,
    href: recommendation.href,
    scoreBreakdown: recommendation.scoreBreakdown,
    sourceSignalIds: recommendation.sourceSignalIds,
  }
}

export async function refreshGarageRecommendations(
  session: ActiveGarageSession,
  now = new Date()
): Promise<GarageIntelligenceBrief> {
  if (!session.garageId || !session.garageName) {
    throw new Error("Aucun garage actif pour générer le brief.")
  }
  const source = await getGarageIntelligenceSourceData(session)
  const snapshot = buildGarageIntelligenceSnapshot({
    garage: {
      id: session.garageId,
      name: session.garageName,
      timezone: "Europe/Paris",
    },
    source,
    now,
  })
  const brief = buildGarageIntelligenceBrief({
    snapshot,
    config: defaultGarageIntelligenceConfig,
    now,
    locale: "fr-FR",
    timezone: snapshot.garage.timezone,
  })
  const supabase = await createClient()
  const existingByKey = new Map(source.recommendations.map((item) => [item.recommendation_key, item]))
  if (brief.recommendations.length) {
    const { error } = await supabase.from("intelligence_recommendations").upsert(
      brief.recommendations.map((recommendation) => {
        const existing = existingByKey.get(recommendation.recommendationKey)
        return {
          garage_id: session.garageId,
          recommendation_key: recommendation.recommendationKey,
          type: recommendation.type,
          category: recommendation.category,
          entity_type: recommendation.entityType,
          entity_id: recommendation.entityId,
          status: recommendation.status,
          score: recommendation.score,
          payload: payload(recommendation),
          first_detected_at: existing?.first_detected_at ?? now.toISOString(),
          last_detected_at: now.toISOString(),
          resolved_at: null,
          dismissed_at: recommendation.status === "DISMISSED"
            ? existing?.dismissed_at ?? now.toISOString()
            : null,
          snoozed_until: recommendation.snoozedUntil,
        }
      }),
      { onConflict: "garage_id,recommendation_key" }
    )
    if (error) throw new Error(`Synchronisation des recommandations impossible (${error.code}).`)
  }
  if (brief.resolvedRecommendationKeys.length) {
    const { error } = await supabase
      .from("intelligence_recommendations")
      .update({
        status: "RESOLVED",
        resolved_at: now.toISOString(),
        snoozed_until: null,
      })
      .eq("garage_id", session.garageId)
      .in("recommendation_key", brief.resolvedRecommendationKeys)
    if (error) throw new Error(`Résolution des recommandations impossible (${error.code}).`)
  }
  return brief
}
