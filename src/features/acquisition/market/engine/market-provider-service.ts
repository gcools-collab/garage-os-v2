import type { AcquisitionOpportunity } from "../../types/opportunity"
import type {
  AcquisitionMarketAnalysis,
  AcquisitionMarketQuery,
  MarketProvider,
} from "../types"
import { analyzeAcquisitionMarket } from "./market-analysis-engine"

export function buildAcquisitionMarketQuery(
  opportunity: AcquisitionOpportunity
): AcquisitionMarketQuery {
  return {
    brand: opportunity.brand,
    model: opportunity.model,
    trim: opportunity.trim,
    year: opportunity.year,
    mileage: opportunity.mileage,
    fuel: opportunity.fuel,
    gearbox: opportunity.gearbox,
    location: opportunity.seller.city,
    sellerType: opportunity.seller.type,
    excludedUrls: opportunity.sourceUrl ? [opportunity.sourceUrl] : [],
    limit: 30,
  }
}

export async function collectAcquisitionMarketAnalysis(
  opportunity: AcquisitionOpportunity,
  provider: MarketProvider | null,
  now: Date
): Promise<AcquisitionMarketAnalysis> {
  if (!provider) {
    return analyzeAcquisitionMarket({
      comparables: [], askingPrice: opportunity.askingPrice, now,
      providerAvailable: false,
      providerMessage: "Aucun provider marché n’est configuré.",
    })
  }
  try {
    const comparables = await provider.search(buildAcquisitionMarketQuery(opportunity), now)
    return analyzeAcquisitionMarket({
      comparables, askingPrice: opportunity.askingPrice, now,
      providerAvailable: true,
    })
  } catch (error) {
    console.error("Acquisition market provider failed", {
      provider: provider.id,
      operation: "search",
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    })
    return analyzeAcquisitionMarket({
      comparables: [], askingPrice: opportunity.askingPrice, now,
      providerAvailable: false,
      providerMessage: "La source marché est temporairement indisponible.",
    })
  }
}
