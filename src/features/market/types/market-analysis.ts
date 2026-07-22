import type { MarketListing } from "./market-listing"

export type MarketPriceStatistics = {
  sampleSize: number
  minimum: number | null
  maximum: number | null
  average: number | null
  median: number | null
}

export type MarketPositioning = "BELOW_MARKET" | "IN_MARKET" | "ABOVE_MARKET"

export type MarketStatistics = {
  comparableCount: number
  minimumPrice: number | null
  maximumPrice: number | null
  averagePrice: number | null
  medianPrice: number | null
  averageMileage: number | null
  averageListingAgeDays: number | null
  professionalCount: number
  privateCount: number
}

export type MarketPricePosition = {
  currentPrice: number
  difference: number
  differencePercent: number
  positioning: MarketPositioning
}

export type MarketAnalysis = {
  listings: MarketListing[]
  priceStatistics: MarketPriceStatistics
  analyzedAt: string
}
