import type { AcquisitionOpportunity } from "../../types/opportunity"
import type { AcquisitionMarketAnalysis } from "../../market/types"

export type RecommendationConfidence = "LOW" | "MEDIUM" | "HIGH"
export type RecommendationRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type RecommendationFactorCode =
  | "ASKING_PRICE" | "VEHICLE_AGE" | "MILEAGE" | "CONDITION"
  | "REPAIR_ESTIMATE" | "PROVENANCE" | "INFORMATION_QUALITY"
  | "DOCUMENTS" | "PHOTOS" | "HISTORY" | "MARKET_EVIDENCE"

export interface RecommendationFactor {
  readonly code: RecommendationFactorCode
  readonly label: string
  readonly weight: number
  readonly impact: number
  readonly explanation: string
}

export interface RecommendationScore {
  readonly value: number
  readonly explanation: string
  readonly factorCodes: readonly RecommendationFactorCode[]
}

export interface PurchaseRecommendationScores {
  readonly market: RecommendationScore
  readonly financial: RecommendationScore
  readonly rotation: RecommendationScore
  readonly confidence: RecommendationScore
  readonly opportunity: RecommendationScore
}

export interface PurchaseRecommendation {
  readonly opportunityId: string
  readonly resaleEstimateLow: number | null
  readonly resaleEstimateMedian: number | null
  readonly resaleEstimateHigh: number | null
  readonly estimatedCosts: number
  readonly estimatedGrossMargin: number | null
  readonly estimatedNetMargin: number | null
  readonly recommendedPurchasePrice: number | null
  readonly maximumPurchasePrice: number | null
  readonly confidence: RecommendationConfidence
  readonly risk: RecommendationRisk
  readonly opportunityScore: number
  readonly scores: PurchaseRecommendationScores
  readonly recommendations: readonly string[]
  readonly factors: readonly RecommendationFactor[]
  readonly calculationBasis: string
  readonly resaleSource: "MARKET_ANALYSIS" | "GARAGE_HISTORY" | "PROVISIONAL" | "UNAVAILABLE"
  readonly generatedAt: string
}

export interface PurchaseRecommendationInput {
  readonly opportunity: AcquisitionOpportunity
  readonly now: Date
  readonly marketAnalysis?: AcquisitionMarketAnalysis | null
  readonly historicalGarageEstimate?: number | null
}
