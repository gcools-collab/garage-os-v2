import type { MarketPricePosition } from "./market-types"

export const MARKET_POSITION_THRESHOLD = 0.08

export function calculateAverage(values: readonly number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

export function calculateMedian(values: readonly number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function calculatePricePosition(price: number | null | undefined, marketPrice: number | null): MarketPricePosition {
  if (!price || !marketPrice) return "UNKNOWN"
  const difference = (price - marketPrice) / marketPrice
  if (difference < -MARKET_POSITION_THRESHOLD) return "UNDER_MARKET"
  if (difference > MARKET_POSITION_THRESHOLD) return "OVER_MARKET"
  return "MARKET"
}
