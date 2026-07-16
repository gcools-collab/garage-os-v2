import type { MarketProvider } from "../providers"
import type { MarketListing, MarketSearchCriteria } from "../types"

export class MarketService {
  constructor(private readonly provider: MarketProvider) {}

  search(criteria: MarketSearchCriteria): Promise<MarketListing[]> {
    return this.provider.search(criteria)
  }
}
