import type { MarketListing } from "./market-listing"

export type MarketMatch = {
  listing: MarketListing
  score: number
  reasons: string[]
}
