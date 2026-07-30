import type { PurchaseRecommendation } from "../types"
import type { PurchaseRecommendationViewModel } from "../presentation"

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0,
})
const formatMoney = (value: number | null) => value === null ? "Non calculable" : money.format(value)
const CONFIDENCE_LABELS = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée" } as const
const RISK = {
  LOW: { label: "Faible", tone: "positive" },
  MEDIUM: { label: "Modéré", tone: "warning" },
  HIGH: { label: "Élevé", tone: "danger" },
  CRITICAL: { label: "Critique", tone: "danger" },
} as const
const SOURCE_LABELS = {
  MARKET_ANALYSIS: "Donnée Leboncoin",
  GARAGE_HISTORY: "Donnée historique",
  PROVISIONAL: "Donnée déclarée",
  UNAVAILABLE: "Données insuffisantes",
} as const

export function buildPurchaseRecommendationViewModel(
  recommendation: PurchaseRecommendation
): PurchaseRecommendationViewModel {
  const risk = RISK[recommendation.risk]
  return {
    available: recommendation.recommendedPurchasePrice !== null,
    title: "Analyse d’acquisition",
    description: recommendation.calculationBasis,
    sourceLabel: SOURCE_LABELS[recommendation.resaleSource],
    resaleRange: recommendation.resaleEstimateLow === null ||
      recommendation.resaleEstimateHigh === null
      ? "Non calculable"
      : `${money.format(recommendation.resaleEstimateLow)} – ${money.format(recommendation.resaleEstimateHigh)}`,
    resaleMedian: formatMoney(recommendation.resaleEstimateMedian),
    recommendedPrice: formatMoney(recommendation.recommendedPurchasePrice),
    maximumPrice: formatMoney(recommendation.maximumPurchasePrice),
    estimatedCosts: formatMoney(recommendation.estimatedCosts),
    estimatedGrossMargin: formatMoney(recommendation.estimatedGrossMargin),
    estimatedNetMargin: formatMoney(recommendation.estimatedNetMargin),
    riskLabel: risk.label,
    riskTone: risk.tone,
    confidenceLabel: CONFIDENCE_LABELS[recommendation.confidence],
    scoreLabel: `${recommendation.opportunityScore} / 100`,
    scores: [
      ["Marché", recommendation.scores.market],
      ["Financier", recommendation.scores.financial],
      ["Rotation", recommendation.scores.rotation],
      ["Confiance", recommendation.scores.confidence],
    ].map(([label, score]) => ({
      label: String(label),
      value: `${typeof score === "string" ? score : score.value} / 100`,
      explanation: typeof score === "string" ? "" : score.explanation,
    })),
    factors: recommendation.factors.map((factor) => ({
      label: factor.label,
      impactLabel: factor.impact > 0 ? `+${factor.impact}` : String(factor.impact),
      explanation: factor.explanation,
    })),
    recommendations: recommendation.recommendations,
  }
}
