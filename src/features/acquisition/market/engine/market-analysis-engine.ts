import type {
  AcquisitionMarketAnalysis,
  ComparableVehicle,
} from "../types"
import {
  buildMarketSignals,
  calculateAcquisitionMarketScore,
  calculateMarketConfidence,
} from "./market-signals"

const round = (value: number) => Math.round(value * 100) / 100
const median = (values: readonly number[]): number | null => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const average = (values: readonly number[]): number | null =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

function splitOutliers(comparables: readonly ComparableVehicle[]) {
  if (comparables.length < 4) return { usable: [...comparables], outlierCount: 0 }
  const prices = comparables.map((item) => item.advertisedPrice).sort((a, b) => a - b)
  const center = median(prices) ?? 0
  const medianDeviation = median(prices.map((price) => Math.abs(price - center))) ?? 0
  const tolerance = Math.max(medianDeviation * 6, center * 0.15)
  const minimum = center - tolerance
  const maximum = center + tolerance
  const usable = comparables.filter((item) =>
    item.advertisedPrice >= minimum && item.advertisedPrice <= maximum
  )
  return { usable, outlierCount: comparables.length - usable.length }
}

function daysBetween(earlier: string, now: Date): number | null {
  const date = new Date(earlier)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000))
}

export function analyzeAcquisitionMarket(input: {
  readonly comparables: readonly ComparableVehicle[]
  readonly askingPrice: number | null
  readonly now: Date
  readonly providerAvailable?: boolean
  readonly providerMessage?: string | null
}): AcquisitionMarketAnalysis {
  const deduplicated = [...new Map(input.comparables.map((item) => [
    `${item.source}:${item.externalId}`, item,
  ])).values()]
  const { usable, outlierCount } = splitOutliers(deduplicated)
  const prices = usable.map((item) => item.advertisedPrice)
  const mean = average(prices)
  const deviation = mean === null ? null : Math.sqrt(
    prices.reduce((sum, price) => sum + (price - mean) ** 2, 0) / prices.length
  )
  const mileage = average(usable.flatMap((item) => item.mileage === null ? [] : [item.mileage]))
  const listingAges = usable.flatMap((item) => {
    const age = item.publishedAt ? daysBetween(item.publishedAt, input.now) : null
    return age === null ? [] : [age]
  })
  const collectionAges = usable.flatMap((item) => {
    const age = daysBetween(item.collectedAt, input.now)
    return age === null ? [] : [age]
  })
  const geography = new Map<string, number>()
  usable.forEach((item) => {
    if (item.location) geography.set(item.location, (geography.get(item.location) ?? 0) + 1)
  })
  const averageListingAgeDays = average(listingAges)
  const freshnessDays = collectionAges.length ? Math.max(...collectionAges) : null
  const averageQuality = average(usable.map((item) => item.dataQuality)) ?? 0
  const confidence = calculateMarketConfidence(usable.length, averageQuality, freshnessDays)
  const medianPrice = median(prices)
  const signals = buildMarketSignals({
    comparableCount: usable.length, averageListingAgeDays,
    askingPrice: input.askingPrice, medianPrice, outlierCount,
  })
  return {
    comparableCount: usable.length,
    minimumPrice: prices.length ? Math.min(...prices) : null,
    medianPrice,
    maximumPrice: prices.length ? Math.max(...prices) : null,
    averagePrice: mean === null ? null : round(mean),
    priceDispersion: mean && deviation !== null ? round(deviation / mean * 100) : null,
    averageMileage: mileage === null ? null : Math.round(mileage),
    averageListingAgeDays: averageListingAgeDays === null ? null : round(averageListingAgeDays),
    geographicDistribution: [...geography.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location)),
    freshnessDays,
    confidence,
    marketScore: calculateAcquisitionMarketScore(confidence, signals),
    signals,
    comparables: usable,
    outlierCount,
    providerAvailable: input.providerAvailable ?? true,
    providerMessage: input.providerMessage ?? null,
    analyzedAt: input.now.toISOString(),
  }
}
