import type { MarketConfidence, MarketHealth, MarketPricePosition } from "./market-types"

export function calculateConfidence(count: number): MarketConfidence {
  if (count === 0) return "VERY_LOW"
  if (count < 4) return "LOW"
  if (count < 10) return "MEDIUM"
  return "HIGH"
}

export function calculateCompetitiveness(price: number | null | undefined, marketPrice: number | null) {
  if (!price || !marketPrice) return null
  const gap = (price - marketPrice) / marketPrice
  return Math.max(0, Math.min(100, Math.round(75 - gap * 200)))
}

export function calculateMarketHealth(count: number, position: MarketPricePosition): MarketHealth {
  if (!count) return "UNKNOWN"
  if (count >= 10 && position !== "OVER_MARKET") return "HOT"
  if (count < 4 || position === "OVER_MARKET") return "SLOW"
  return "NORMAL"
}
