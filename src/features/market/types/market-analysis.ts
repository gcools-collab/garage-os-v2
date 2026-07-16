import type { MarketListing } from "./market-listing"

export type MarketPriceStatistics = {
  sampleSize: number
  minimum: number | null
  maximum: number | null
  average: number | null
  median: number | null
}

export type MarketAnalysis = {
  listings: MarketListing[]
  priceStatistics: MarketPriceStatistics
  analyzedAt: string
}
