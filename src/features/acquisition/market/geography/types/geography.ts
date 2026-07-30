export type GeographicAnalysisLevel = "LOCAL" | "REGIONAL" | "NATIONAL"
export type GeographicRadius = 25 | 50 | 100
export type LocalMarketSignalCode =
  | "LOCAL_RARE"
  | "LOCAL_COMMON"
  | "LOCAL_UNDERVALUED"
  | "LOCAL_OVERVALUED"
  | "LONG_DISTANCE_BUY"
  | "LOCAL_OPPORTUNITY"
  | "LOCAL_SATURATION"

export interface GeoPoint {
  readonly latitude: number
  readonly longitude: number
}

export interface GarageMarketLocation {
  readonly postalCode: string | null
  readonly city: string | null
  readonly coordinates: GeoPoint | null
}

export interface GeographicComparableInput {
  readonly externalId: string
  readonly advertisedPrice: number
  readonly location: string | null
  readonly postalCode: string | null
  readonly coordinates: GeoPoint | null
}

export interface GeographicComparable {
  readonly externalId: string
  readonly location: string | null
  readonly postalCode: string | null
  readonly coordinates: GeoPoint | null
  readonly distanceKm: number | null
  readonly radiusKm: GeographicRadius | null
  readonly zone: GeographicAnalysisLevel
}

export interface GeographicRadiusMetric {
  readonly radiusKm: GeographicRadius
  readonly listingCount: number | null
}

export interface LocalMarketSignal {
  readonly code: LocalMarketSignalCode
  readonly explanation: string
}

export interface MarketMapPoint {
  readonly externalId: string
  readonly coordinates: GeoPoint
  readonly distanceKm: number | null
  readonly advertisedPrice: number
}

export interface GeographicMarketAnalysis {
  readonly available: boolean
  readonly origin: GarageMarketLocation
  readonly radii: readonly GeographicRadiusMetric[]
  readonly nationalListingCount: number
  readonly localMedianPrice: number | null
  readonly nationalMedianPrice: number | null
  readonly localNationalDifferencePercent: number | null
  readonly averageDistanceKm: number | null
  readonly medianDistanceKm: number | null
  readonly heatScore: number | null
  readonly signals: readonly LocalMarketSignal[]
  readonly comparables: readonly GeographicComparable[]
  readonly mapPoints: readonly MarketMapPoint[]
  readonly message: string | null
}

export interface GeographicMarketViewModel {
  readonly title: string
  readonly description: string
  readonly metrics: readonly { readonly label: string; readonly value: string }[]
  readonly signals: readonly { readonly code: LocalMarketSignalCode; readonly label: string; readonly explanation: string }[]
}
