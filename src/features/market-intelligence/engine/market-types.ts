export type MarketVehicle = {
  id: string
  brand: string
  model: string
  trim?: string | null
  year?: number | null
  price?: number | null
  mileage?: number | null
  fuel?: string | null
  gearbox?: string | null
}

export type MarketListing = {
  id: string
  source: string
  price: number
  brand?: string | null
  model?: string | null
  trim?: string | null
  year?: number | null
  mileage?: number | null
  fuel?: string | null
  gearbox?: string | null
  url?: string | null
  city?: string | null
  department?: string | null
  postedAt?: string | null
  imagesCount?: number | null
  dealer?: boolean
  privateSeller?: boolean
  featured?: boolean
  title?: string | null
  description?: string | null
}

export type MarketPricePosition = "UNDER_MARKET" | "MARKET" | "OVER_MARKET" | "UNKNOWN"
export type MarketHealth = "HOT" | "NORMAL" | "SLOW" | "UNKNOWN"
export type MarketConfidence = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH"
export type MarketOpportunity =
  | "BAISSE_PRIX"
  | "HAUSSE_PRIX"
  | "BON_PRIX"
  | "MARCHE_FAIBLE"
  | "MARCHE_FORT"
export type MarketWarning =
  | "NOT_ENOUGH_DATA"
  | "NO_COMPARABLE"
  | "PRICE_TOO_HIGH"
  | "PRICE_TOO_LOW"

export type MarketAnalysis = {
  vehicleId: string
  marketPrice: number | null
  minPrice: number | null
  maxPrice: number | null
  medianPrice: number | null
  averagePrice: number | null
  listingCount: number
  recommendedPrice: number | null
  competitivenessScore: number | null
  pricePosition: MarketPricePosition
  marketHealth: MarketHealth
  confidence: MarketConfidence
  opportunities: MarketOpportunity[]
  warnings: MarketWarning[]
  comparables: MarketListing[]
}

export type MarketEngineOptions = {
  yearTolerance?: number
  mileageTolerance?: number
  comparableLimit?: number
}
