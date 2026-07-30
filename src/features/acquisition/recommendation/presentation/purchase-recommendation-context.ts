import type {
  RecommendationConfidence,
  RecommendationRisk,
} from "../types"

export interface PurchaseRecommendationContext {
  readonly opportunityId: string
  readonly resaleEstimateMedian: number | null
  readonly recommendedPurchasePrice: number | null
  readonly maximumPurchasePrice: number | null
  readonly estimatedNetMargin: number | null
  readonly confidence: RecommendationConfidence
  readonly risk: RecommendationRisk
  readonly opportunityScore: number
  readonly explanations: readonly string[]
}
