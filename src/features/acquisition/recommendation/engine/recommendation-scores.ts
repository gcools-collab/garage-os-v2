import type { AcquisitionOpportunity } from "../../types/opportunity"
import type {
  RecommendationFactor,
  RecommendationScore,
} from "../types"

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const impact = (factors: readonly RecommendationFactor[], codes: readonly string[]) =>
  factors.filter((factor) => codes.includes(factor.code))
    .reduce((total, factor) => total + factor.impact, 0)

export function calculateMarketScore(
  factors: readonly RecommendationFactor[]
): RecommendationScore {
  return {
    value: clamp(50 + impact(factors, ["CONDITION", "VEHICLE_AGE", "MILEAGE"])),
    explanation: "Score préliminaire fondé sur le véhicule ; aucune donnée de marché externe n’est encore utilisée.",
    factorCodes: ["CONDITION", "VEHICLE_AGE", "MILEAGE"],
  }
}

export function calculateFinancialScore(
  resaleMedian: number | null,
  netMargin: number | null
): RecommendationScore {
  const ratio = resaleMedian && netMargin !== null ? netMargin / resaleMedian : 0
  return {
    value: clamp(ratio * 300),
    explanation: resaleMedian === null
      ? "Le score financier est indisponible sans prix demandé."
      : `La marge nette cible représente ${(ratio * 100).toFixed(1).replace(".", ",")} % de l’estimation médiane.`,
    factorCodes: ["ASKING_PRICE", "REPAIR_ESTIMATE"],
  }
}

export function calculateRotationScore(
  opportunity: AcquisitionOpportunity,
  factors: readonly RecommendationFactor[]
): RecommendationScore {
  const conditionPenalty = opportunity.generalCondition === "POOR" ? 15 : 0
  return {
    value: clamp(55 + impact(factors, ["VEHICLE_AGE", "MILEAGE", "CONDITION"]) - conditionPenalty),
    explanation: "Indicateur provisoire fondé sur l’âge, le kilométrage et l’état, sans historique de ventes.",
    factorCodes: ["VEHICLE_AGE", "MILEAGE", "CONDITION"],
  }
}

export function calculateConfidenceScore(
  factors: readonly RecommendationFactor[]
): RecommendationScore {
  return {
    value: clamp(60 + impact(factors, [
      "ASKING_PRICE", "INFORMATION_QUALITY", "DOCUMENTS", "PHOTOS", "HISTORY",
    ])),
    explanation: "La confiance dépend uniquement de la complétude et des preuves disponibles.",
    factorCodes: ["ASKING_PRICE", "INFORMATION_QUALITY", "DOCUMENTS", "PHOTOS", "HISTORY"],
  }
}

export function calculateOpportunityScore(input: {
  readonly market: RecommendationScore
  readonly financial: RecommendationScore
  readonly rotation: RecommendationScore
  readonly confidence: RecommendationScore
}): RecommendationScore {
  return {
    value: clamp(
      input.market.value * 0.3 + input.financial.value * 0.35 +
      input.rotation.value * 0.2 + input.confidence.value * 0.15
    ),
    explanation: "30 % marché, 35 % financier, 20 % rotation et 15 % confiance.",
    factorCodes: [...new Set([
      ...input.market.factorCodes, ...input.financial.factorCodes,
      ...input.rotation.factorCodes, ...input.confidence.factorCodes,
    ])],
  }
}
