import { prepareOpportunities, prepareWarnings } from "./market-opportunity"
import { calculateAverage, calculateMedian, calculatePricePosition } from "./market-price"
import { calculateCompetitiveness, calculateConfidence, calculateMarketHealth } from "./market-score"
import type { MarketAnalysis, MarketEngineOptions, MarketListing, MarketVehicle } from "./market-types"

const DEFAULT_OPTIONS: Required<MarketEngineOptions> = {
  yearTolerance: 2,
  mileageTolerance: 30_000,
  comparableLimit: 20,
}

function normalize(value?: string | null) {
  return value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() ?? ""
}

export function selectComparables(
  vehicle: MarketVehicle,
  listings: readonly MarketListing[],
  options: MarketEngineOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  return listings
    .filter((listing) => normalize(listing.brand) === normalize(vehicle.brand))
    .filter((listing) => normalize(listing.model) === normalize(vehicle.model))
    .filter((listing) => !vehicle.year || !listing.year || Math.abs(listing.year - vehicle.year) <= config.yearTolerance)
    .filter((listing) => !vehicle.mileage || !listing.mileage || Math.abs(listing.mileage - vehicle.mileage) <= config.mileageTolerance)
    .filter((listing) => !vehicle.fuel || !listing.fuel || normalize(listing.fuel) === normalize(vehicle.fuel))
    .filter((listing) => !vehicle.gearbox || !listing.gearbox || normalize(listing.gearbox) === normalize(vehicle.gearbox))
    .filter((listing) => Number.isFinite(listing.price) && listing.price > 0)
    .sort((first, second) => {
      const yearGap = Math.abs((first.year ?? vehicle.year ?? 0) - (vehicle.year ?? first.year ?? 0))
        - Math.abs((second.year ?? vehicle.year ?? 0) - (vehicle.year ?? second.year ?? 0))
      const mileageGap = Math.abs((first.mileage ?? vehicle.mileage ?? 0) - (vehicle.mileage ?? first.mileage ?? 0))
        - Math.abs((second.mileage ?? vehicle.mileage ?? 0) - (vehicle.mileage ?? second.mileage ?? 0))
      return yearGap || mileageGap || first.id.localeCompare(second.id)
    })
    .slice(0, config.comparableLimit)
    .map((listing) => structuredClone(listing))
}

export function analyzeVehicleMarket(
  vehicle: MarketVehicle,
  listings: readonly MarketListing[],
  options: MarketEngineOptions = {}
): MarketAnalysis {
  const comparables = selectComparables(vehicle, listings, options)
  const prices = comparables.map((listing) => listing.price)
  const medianPrice = calculateMedian(prices)
  const averagePrice = calculateAverage(prices)
  const pricePosition = calculatePricePosition(vehicle.price, medianPrice)
  const competitivenessScore = calculateCompetitiveness(vehicle.price, medianPrice)
  const confidence = calculateConfidence(comparables.length)
  const marketHealth = calculateMarketHealth(comparables.length, pricePosition)
  return {
    vehicleId: vehicle.id,
    marketPrice: medianPrice,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    medianPrice,
    averagePrice,
    listingCount: comparables.length,
    recommendedPrice: medianPrice === null ? null : Math.round(medianPrice / 100) * 100,
    competitivenessScore,
    pricePosition,
    marketHealth,
    confidence,
    opportunities: prepareOpportunities(pricePosition, marketHealth),
    warnings: prepareWarnings(comparables.length, pricePosition),
    comparables,
  }
}

export function createMarketEngine({
  vehicles,
  listings,
  options,
}: {
  vehicles: readonly MarketVehicle[]
  listings: readonly MarketListing[]
  options?: MarketEngineOptions
}) {
  return {
    analyzeVehicle(vehicleId: string) {
      const vehicle = vehicles.find((candidate) => candidate.id === vehicleId)
      return vehicle ? analyzeVehicleMarket(vehicle, listings, options) : null
    },
    analyze(vehicle: MarketVehicle) {
      return analyzeVehicleMarket(vehicle, listings, options)
    },
  }
}
