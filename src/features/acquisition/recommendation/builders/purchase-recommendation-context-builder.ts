import type { PurchaseRecommendation } from "../types"
import type { PurchaseRecommendationContext } from "../presentation"

export function buildPurchaseRecommendationContext(
  recommendation: PurchaseRecommendation
): PurchaseRecommendationContext {
  return {
    opportunityId: recommendation.opportunityId,
    resaleEstimateMedian: recommendation.resaleEstimateMedian,
    recommendedPurchasePrice: recommendation.recommendedPurchasePrice,
    maximumPurchasePrice: recommendation.maximumPurchasePrice,
    estimatedNetMargin: recommendation.estimatedNetMargin,
    confidence: recommendation.confidence,
    risk: recommendation.risk,
    opportunityScore: recommendation.opportunityScore,
    explanations: recommendation.factors.map((factor) => factor.explanation),
  }
}
