import type {
  PurchaseRecommendation,
  PurchaseRecommendationInput,
  RecommendationConfidence,
  RecommendationRisk,
} from "../types"
import {
  buildRecommendationFactors,
  getResaleAdjustmentPercent,
} from "./recommendation-factors"
import {
  calculateConfidenceScore,
  calculateFinancialScore,
  calculateMarketScore,
  calculateOpportunityScore,
  calculateRotationScore,
} from "./recommendation-scores"

const roundToFifty = (value: number) => Math.max(0, Math.round(value / 50) * 50)
const confidenceLevel = (score: number): RecommendationConfidence =>
  score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW"
const riskLevel = (score: number, confidence: number): RecommendationRisk => {
  if (confidence < 30 || score < 25) return "CRITICAL"
  if (confidence < 50 || score < 45) return "HIGH"
  if (score < 65) return "MEDIUM"
  return "LOW"
}

export function buildPurchaseRecommendation(
  input: PurchaseRecommendationInput
): PurchaseRecommendation {
  const { opportunity, now } = input
  const factors = buildRecommendationFactors(opportunity, now)
  const reference = opportunity.askingPrice !== null && opportunity.askingPrice > 0
    ? opportunity.askingPrice
    : null
  const adjustment = getResaleAdjustmentPercent(factors)
  const resaleMedian = reference === null
    ? null
    : roundToFifty(reference * (1 + adjustment / 100))
  const resaleLow = resaleMedian === null ? null : roundToFifty(resaleMedian * 0.92)
  const resaleHigh = resaleMedian === null ? null : roundToFifty(resaleMedian * 1.08)
  const estimatedCosts = opportunity.repairEstimate ?? 0
  const targetMargin = resaleMedian === null ? null : Math.max(1_500, resaleMedian * 0.15)
  const minimumMargin = resaleMedian === null ? null : Math.max(1_000, resaleMedian * 0.1)
  const recommendedPurchasePrice = resaleMedian === null || targetMargin === null || reference === null
    ? null : roundToFifty(Math.min(reference, resaleMedian - estimatedCosts - targetMargin))
  const maximumPurchasePrice = resaleMedian === null || minimumMargin === null || reference === null
    ? null : roundToFifty(Math.min(reference, resaleMedian - estimatedCosts - minimumMargin))
  const grossMargin = resaleMedian === null || recommendedPurchasePrice === null
    ? null : resaleMedian - recommendedPurchasePrice
  const netMargin = grossMargin === null ? null : grossMargin - estimatedCosts
  const market = calculateMarketScore(factors)
  const financial = calculateFinancialScore(resaleMedian, netMargin)
  const rotation = calculateRotationScore(opportunity, factors)
  const confidence = calculateConfidenceScore(factors)
  const opportunityScore = calculateOpportunityScore({ market, financial, rotation, confidence })
  const recommendations = [
    reference === null ? "Renseigner le prix demandé avant toute négociation." : null,
    opportunity.repairEstimate === null ? "Faire chiffrer les travaux avant de confirmer le prix." : null,
    !opportunity.documents.some((item) => item.category === "TECHNICAL_INSPECTION")
      ? "Demander le contrôle technique lorsqu’il est applicable." : null,
    !opportunity.documents.some((item) => item.category === "PHOTO")
      ? "Ajouter des photos pour fiabiliser l’évaluation de l’état." : null,
  ].filter((item): item is string => item !== null)
  return {
    opportunityId: opportunity.id,
    resaleEstimateLow: resaleLow,
    resaleEstimateMedian: resaleMedian,
    resaleEstimateHigh: resaleHigh,
    estimatedCosts,
    estimatedGrossMargin: grossMargin,
    estimatedNetMargin: netMargin,
    recommendedPurchasePrice,
    maximumPurchasePrice,
    confidence: confidenceLevel(confidence.value),
    risk: riskLevel(opportunityScore.value, confidence.value),
    opportunityScore: opportunityScore.value,
    scores: { market, financial, rotation, confidence, opportunity: opportunityScore },
    recommendations,
    factors,
    calculationBasis: reference === null
      ? "Données insuffisantes : aucun prix demandé."
      : "Estimation préliminaire fondée sur le prix demandé, l’état, l’âge et le kilométrage. Elle ne constitue pas encore une analyse du marché.",
    generatedAt: now.toISOString(),
  }
}
