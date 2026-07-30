import type { GarageIntelligenceConfig } from "../config"
import type {
  AcquisitionOpportunityScore,
  IntelligenceAcquisitionOpportunitySnapshot,
  PriceRecommendation,
  RecommendationConfidence,
} from "../types"

const confidenceRank: Readonly<Record<RecommendationConfidence, number>> = {
  LOW: 0, MEDIUM: 1, HIGH: 2,
}

function commercialRound(cents: number) {
  const euros = Math.max(0, Math.floor(cents / 100))
  const step = euros >= 10_000 ? 1_000 : 100
  return Math.max(0, Math.floor(euros / step) * step - 10) * 100
}

export function computePriceRecommendation(input: {
  readonly currentPriceCents: number
  readonly medianPriceCents: number | null
  readonly averagePriceCents: number | null
  readonly comparableCount: number
  readonly stockAgeDays: number
  readonly capitalInvestedCents: number | null
  readonly minimumMarginCents: number
  readonly confidence: RecommendationConfidence
  readonly config: GarageIntelligenceConfig
}): PriceRecommendation {
  if (
    input.medianPriceCents === null
    || input.comparableCount < input.config.minimumComparableCount
    || confidenceRank[input.confidence] < confidenceRank[input.config.minimumMarketConfidence]
  ) {
    return {
      kind: "INSUFFICIENT_DATA",
      suggestedPriceCents: null,
      suggestedChangeCents: null,
      confidence: "LOW",
      reasons: ["Les comparables sont insuffisants pour proposer un montant fiable."],
    }
  }
  const differencePercent = (
    (input.currentPriceCents - input.medianPriceCents) / input.medianPriceCents
  ) * 100
  if (differencePercent <= input.config.aboveMarketPercent) {
    return {
      kind: "KEEP",
      suggestedPriceCents: input.currentPriceCents,
      suggestedChangeCents: 0,
      confidence: input.confidence,
      reasons: ["Le prix actuel reste cohérent avec la médiane observée."],
    }
  }
  const marketTarget = input.averagePriceCents === null
    ? input.medianPriceCents
    : Math.round((input.medianPriceCents * 2 + input.averagePriceCents) / 3)
  const floor = input.capitalInvestedCents === null
    ? 0
    : input.capitalInvestedCents + input.minimumMarginCents
  const suggested = Math.max(floor, commercialRound(marketTarget))
  if (suggested >= input.currentPriceCents) {
    return {
      kind: "REVIEW",
      suggestedPriceCents: null,
      suggestedChangeCents: null,
      confidence: input.confidence,
      reasons: ["La marge minimale empêche de proposer une baisse automatique."],
    }
  }
  return {
    kind: input.stockAgeDays >= input.config.priceReviewDays ? "REDUCE" : "REVIEW",
    suggestedPriceCents: suggested,
    suggestedChangeCents: suggested - input.currentPriceCents,
    confidence: input.confidence,
    reasons: [
      "Le prix dépasse la médiane du marché.",
      "La proposition respecte le capital investi et la marge minimale.",
    ],
  }
}

export function computeAcquisitionOpportunityScore(
  opportunity: IntelligenceAcquisitionOpportunitySnapshot,
  config: GarageIntelligenceConfig,
  now: Date
): AcquisitionOpportunityScore | null {
  if (
    opportunity.askingPriceCents <= 0
    || opportunity.marketMedianCents <= 0
    || opportunity.estimatedMarginCents < config.minimumEstimatedMarginCents
    || opportunity.comparableCount < config.minimumComparableCount
    || opportunity.confidence === "LOW"
  ) return null
  const marginPercent = opportunity.estimatedMarginCents / opportunity.askingPriceCents * 100
  const discountPercent = (
    opportunity.marketMedianCents - opportunity.askingPriceCents
  ) / opportunity.marketMedianCents * 100
  const ageDays = Math.max(0, (now.getTime() - Date.parse(opportunity.listedAt)) / 86_400_000)
  const score = Math.min(100, Math.round(
    Math.min(40, marginPercent)
    + Math.min(30, Math.max(0, discountPercent))
    + (opportunity.confidence === "HIGH" ? 20 : 12)
    + (ageDays <= 7 ? 10 : 3)
  ))
  return {
    score,
    level: score >= 75 ? "HIGH" : score >= 55 ? "MEDIUM" : "LOW",
    reasons: [
      `Marge estimée de ${opportunity.estimatedMarginCents} centimes.`,
      `Écart au marché de ${Math.round(discountPercent)} %.`,
    ],
    estimatedMarginCents: opportunity.estimatedMarginCents,
    confidence: opportunity.confidence,
  }
}
