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
  const baseFactors = buildRecommendationFactors(opportunity, now)
  const reliableMarket = input.marketAnalysis &&
    input.marketAnalysis.comparableCount >= 3 &&
    input.marketAnalysis.confidence !== "LOW" &&
    input.marketAnalysis.medianPrice !== null
    ? input.marketAnalysis
    : null
  const factors = reliableMarket ? [...baseFactors, {
    code: "MARKET_EVIDENCE" as const,
    label: "Analyse marché",
    weight: 0,
    impact: 10,
    explanation: `${reliableMarket.comparableCount} comparables fiables placent la médiane à ${Math.round(reliableMarket.medianPrice ?? 0).toLocaleString("fr-FR")} €.`,
  }] : baseFactors
  const reference = opportunity.askingPrice !== null && opportunity.askingPrice > 0
    ? opportunity.askingPrice : null
  const adjustment = getResaleAdjustmentPercent(factors)
  const historicalEstimate = input.historicalGarageEstimate &&
    input.historicalGarageEstimate > 0 ? input.historicalGarageEstimate : null
  const provisionalMedian = reference === null
    ? null : roundToFifty(reference * (1 + adjustment / 100))
  const resaleMedian = reliableMarket?.medianPrice ?? historicalEstimate ?? provisionalMedian
  const resaleLow = reliableMarket?.minimumPrice ??
    (resaleMedian === null ? null : roundToFifty(resaleMedian * 0.92))
  const resaleHigh = reliableMarket?.maximumPrice ??
    (resaleMedian === null ? null : roundToFifty(resaleMedian * 1.08))
  const resaleSource = reliableMarket
    ? "MARKET_ANALYSIS" as const
    : historicalEstimate !== null
      ? "GARAGE_HISTORY" as const
      : provisionalMedian !== null
        ? "PROVISIONAL" as const
        : "UNAVAILABLE" as const
  const estimatedCosts = opportunity.repairEstimate ?? 0
  const targetMargin = resaleMedian === null ? null : Math.max(1_500, resaleMedian * 0.15)
  const minimumMargin = resaleMedian === null ? null : Math.max(1_000, resaleMedian * 0.1)
  const priceCeiling = reference ?? Number.POSITIVE_INFINITY
  const recommendedPurchasePrice = resaleMedian === null || targetMargin === null
    ? null : roundToFifty(Math.min(priceCeiling, resaleMedian - estimatedCosts - targetMargin))
  const maximumPurchasePrice = resaleMedian === null || minimumMargin === null
    ? null : roundToFifty(Math.min(priceCeiling, resaleMedian - estimatedCosts - minimumMargin))
  const grossMargin = resaleMedian === null || recommendedPurchasePrice === null
    ? null : resaleMedian - recommendedPurchasePrice
  const netMargin = grossMargin === null ? null : grossMargin - estimatedCosts
  const market = reliableMarket ? {
    value: reliableMarket.marketScore,
    explanation: `Score issu de ${reliableMarket.comparableCount} comparables normalisés.`,
    factorCodes: ["MARKET_EVIDENCE" as const],
  } : calculateMarketScore(factors)
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
    calculationBasis: reliableMarket
      ? `Estimation fondée sur ${reliableMarket.comparableCount} annonces comparables normalisées.`
      : historicalEstimate !== null
        ? "Estimation fondée sur l’historique du garage."
        : reference === null
          ? "Données insuffisantes : aucun prix demandé."
          : "Estimation préliminaire fondée sur le prix demandé, l’état, l’âge et le kilométrage. Elle ne constitue pas encore une analyse du marché.",
    resaleSource,
    generatedAt: now.toISOString(),
  }
}
