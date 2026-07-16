import type {
  MarketListing,
  MarketMatch,
  MarketSearchCriteria,
} from "../types"

export interface MatchingEngine {
  match(
    criteria: MarketSearchCriteria,
    listings: readonly MarketListing[]
  ): Promise<MarketMatch[]>
}
