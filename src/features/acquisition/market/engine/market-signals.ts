import type {
  AcquisitionMarketConfidence,
  MarketSignal,
} from "../types"

export function buildMarketSignals(input: {
  readonly comparableCount: number
  readonly averageListingAgeDays: number | null
  readonly askingPrice: number | null
  readonly medianPrice: number | null
  readonly outlierCount: number
}): readonly MarketSignal[] {
  const signals: MarketSignal[] = []
  if (input.comparableCount < 3) {
    signals.push({ code: "LIMITED_DATA", level: "WARNING", explanation: "Moins de trois comparables exploitables." })
  } else if (input.comparableCount <= 5) {
    signals.push({ code: "LOW_SUPPLY", level: "POSITIVE", explanation: "L’offre comparable observée est limitée." })
  } else if (input.comparableCount >= 15) {
    signals.push({ code: "HIGH_SUPPLY", level: "WARNING", explanation: "Le nombre de véhicules comparables indique une offre abondante." })
  }
  if (input.averageListingAgeDays !== null && input.averageListingAgeDays <= 21) {
    signals.push({ code: "FAST_ROTATION", level: "POSITIVE", explanation: "Les annonces comparables observées sont récentes." })
  } else if (input.averageListingAgeDays !== null && input.averageListingAgeDays >= 60) {
    signals.push({ code: "SLOW_ROTATION", level: "WARNING", explanation: "Les annonces comparables restent visibles longtemps." })
  }
  if (input.askingPrice !== null && input.medianPrice !== null && input.medianPrice > 0) {
    const gap = (input.askingPrice - input.medianPrice) / input.medianPrice
    if (gap <= -0.1) signals.push({ code: "UNDER_PRICED", level: "POSITIVE", explanation: "Le prix demandé est au moins 10 % sous la médiane observée." })
    if (gap >= 0.1) signals.push({ code: "OVER_PRICED", level: "WARNING", explanation: "Le prix demandé est au moins 10 % au-dessus de la médiane observée." })
  }
  const lowSupply = signals.some((signal) => signal.code === "LOW_SUPPLY")
  const highSupply = signals.some((signal) => signal.code === "HIGH_SUPPLY")
  const fast = signals.some((signal) => signal.code === "FAST_ROTATION")
  const slow = signals.some((signal) => signal.code === "SLOW_ROTATION")
  if (lowSupply && fast) signals.push({ code: "HIGH_DEMAND", level: "POSITIVE", explanation: "Offre limitée et annonces récentes suggèrent une demande soutenue." })
  if (highSupply && slow) signals.push({ code: "LOW_DEMAND", level: "WARNING", explanation: "Offre abondante et annonces anciennes suggèrent une demande limitée." })
  if (input.outlierCount > 0) {
    signals.push({ code: "OUTLIERS_DETECTED", level: "INFO", explanation: `${input.outlierCount} valeur(s) aberrante(s) ont été écartées des statistiques de prix.` })
  }
  return signals
}

export function calculateMarketConfidence(
  count: number,
  averageQuality: number,
  freshnessDays: number | null
): AcquisitionMarketConfidence {
  if (count >= 8 && averageQuality >= 70 && freshnessDays !== null && freshnessDays <= 7) return "HIGH"
  if (count >= 3 && averageQuality >= 50 && freshnessDays !== null && freshnessDays <= 30) return "MEDIUM"
  return "LOW"
}

export function calculateAcquisitionMarketScore(
  confidence: AcquisitionMarketConfidence,
  signals: readonly MarketSignal[]
): number {
  const base = confidence === "HIGH" ? 70 : confidence === "MEDIUM" ? 55 : 35
  const signalImpact = signals.reduce((total, signal) => {
    if (["HIGH_DEMAND", "FAST_ROTATION", "LOW_SUPPLY", "UNDER_PRICED"].includes(signal.code)) return total + 5
    if (["LOW_DEMAND", "SLOW_ROTATION", "HIGH_SUPPLY", "OVER_PRICED"].includes(signal.code)) return total - 5
    return total
  }, 0)
  return Math.max(0, Math.min(100, base + signalImpact))
}
