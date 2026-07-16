import type {
  MarketAnalysis,
  MarketListing,
  MarketSearchCriteria,
  PriceRecommendation,
} from "../types"

export interface PricingEngine {
  analyze(
    criteria: MarketSearchCriteria,
    listings: readonly MarketListing[]
  ): Promise<MarketAnalysis>

  recommend(analysis: MarketAnalysis): Promise<PriceRecommendation>
}
