import type { MarketMatch, MarketPricePosition, MarketStatistics } from "./types"

export type VehicleMarketAnalysisSnapshot = MarketStatistics & {
  id: string
  analyzedAt: string
  currentVehiclePrice: number | null
  priceDifference: number | null
  priceDifferencePercent: number | null
  positioning: MarketPricePosition["positioning"] | null
}

export type MarketAnalysisSuccess = {
  ok: true
  analysis: VehicleMarketAnalysisSnapshot
  comparables: MarketMatch[]
}

export type MarketAnalysisActionResult = MarketAnalysisSuccess | { ok: false; message: string }
