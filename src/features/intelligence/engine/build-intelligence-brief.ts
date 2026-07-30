import type { GarageIntelligenceConfig } from "../config"
import type { GarageIntelligenceSnapshot, GarageRecommendation } from "../types"
import { detectGarageIntelligenceSignals } from "./signal-detectors"
import { buildRecommendationsFromSignals, deduplicateRecommendations } from "./recommendation-engine"

export type GarageIntelligenceBrief = {
  readonly snapshot: GarageIntelligenceSnapshot
  readonly signals: ReturnType<typeof detectGarageIntelligenceSignals>
  readonly recommendations: readonly GarageRecommendation[]
  readonly resolvedRecommendationKeys: readonly string[]
}

export function buildGarageIntelligenceBrief(input: {
  readonly snapshot: GarageIntelligenceSnapshot
  readonly config: GarageIntelligenceConfig
  readonly now: Date
  readonly locale: string
  readonly timezone: string
}): GarageIntelligenceBrief {
  void input.locale
  void input.timezone
  const signals = detectGarageIntelligenceSignals(input.snapshot, input.config, input.now)
  const recommendations = deduplicateRecommendations(
    buildRecommendationsFromSignals(signals, input.snapshot, input.config, input.now)
  ).slice(0, input.config.maximumRecommendationsPerBrief)
  const detectedKeys = new Set(recommendations.map((item) => item.recommendationKey))
  return {
    snapshot: input.snapshot,
    signals,
    recommendations,
    resolvedRecommendationKeys: input.snapshot.previousRecommendations
      .filter((item) => ["ACTIVE", "COMPLETED", "SNOOZED"].includes(item.status) && !detectedKeys.has(item.recommendationKey))
      .map((item) => item.recommendationKey),
  }
}
