import type { AcquisitionOpportunity } from "../../../types/opportunity"
import type { AcquisitionMarketAnalysis } from "../../types"
import type { AcquisitionMarketAiContext } from "../types"

export function buildAcquisitionMarketAiContext(
  opportunity: AcquisitionOpportunity,
  market: AcquisitionMarketAnalysis,
  supportsVision: boolean
): AcquisitionMarketAiContext {
  return {
    vehicle: {
      brand: opportunity.brand,
      model: opportunity.model,
      trim: opportunity.trim,
      year: opportunity.year,
      mileage: opportunity.mileage,
      fuel: opportunity.fuel,
      gearbox: opportunity.gearbox,
      generalCondition: opportunity.generalCondition,
      declaredPrice: opportunity.askingPrice,
      declaredRepairEstimate: opportunity.repairEstimate,
    },
    deterministicMarket: {
      comparableCount: market.comparableCount,
      displayedPriceMedian: market.medianPrice,
      displayedPriceRange: [market.minimumPrice, market.maximumPrice],
      signals: market.signals.map((signal) => `${signal.code}: ${signal.explanation}`),
      confidence: market.confidence,
    },
    publicListings: market.comparables.slice(0, 10).map((item) => ({
      reference: `${item.source}:${item.externalId}`,
      description: item.description?.slice(0, 2_000) ?? null,
      imageUrls: supportsVision ? item.imageUrls.slice(0, 4) : [],
    })),
  }
}
