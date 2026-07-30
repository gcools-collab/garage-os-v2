import type { AcquisitionOpportunity } from "../../types/opportunity"
import type { GarageMarketLocation } from "../geography"
import type {
  AcquisitionMarketAnalysis,
  AcquisitionMarketQuery,
  MarketProvider,
} from "../types"
import { analyzeAcquisitionMarket } from "./market-analysis-engine"

const UNKNOWN_ORIGIN: GarageMarketLocation = {
  postalCode: null,
  city: null,
  coordinates: null,
}

export function buildAcquisitionMarketQuery(
  opportunity: AcquisitionOpportunity,
  origin: GarageMarketLocation = UNKNOWN_ORIGIN
): AcquisitionMarketQuery {
  return {
    brand: opportunity.brand,
    model: opportunity.model,
    trim: opportunity.trim,
    year: opportunity.year,
    mileage: opportunity.mileage,
    fuel: opportunity.fuel,
    gearbox: opportunity.gearbox,
    location: origin.city,
    postalCode: origin.postalCode,
    latitude: origin.coordinates?.latitude ?? null,
    longitude: origin.coordinates?.longitude ?? null,
    radiusKm: null,
    sellerType: opportunity.seller.type,
    excludedUrls: opportunity.sourceUrl ? [opportunity.sourceUrl] : [],
    limit: 30,
  }
}

export async function collectAcquisitionMarketAnalysis(
  opportunity: AcquisitionOpportunity,
  provider: MarketProvider | null,
  now: Date,
  origin: GarageMarketLocation = UNKNOWN_ORIGIN
): Promise<AcquisitionMarketAnalysis> {
  if (!provider) {
    return analyzeAcquisitionMarket({
      comparables: [], askingPrice: opportunity.askingPrice, now,
      providerAvailable: false,
      providerMessage: "Aucun provider marché n’est configuré.",
      origin,
    })
  }
  try {
    const comparables = await provider.search(
      buildAcquisitionMarketQuery(opportunity, origin),
      now
    )
    return analyzeAcquisitionMarket({
      comparables, askingPrice: opportunity.askingPrice, now,
      providerAvailable: true,
      origin,
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
      origin,
    })
  }
}
