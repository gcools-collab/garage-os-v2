import type { MarketListing, MarketSearchCriteria } from "../types"

export interface MarketProvider {
  readonly id: string
  search(criteria: MarketSearchCriteria): Promise<MarketListing[]>
}
