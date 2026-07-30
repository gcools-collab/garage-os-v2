export type AcquisitionMarketConfidence = "LOW" | "MEDIUM" | "HIGH"
export type AcquisitionMarketSignalCode =
  | "LOW_SUPPLY" | "HIGH_SUPPLY" | "FAST_ROTATION" | "SLOW_ROTATION"
  | "UNDER_PRICED" | "OVER_PRICED" | "HIGH_DEMAND" | "LOW_DEMAND"
  | "LIMITED_DATA" | "OUTLIERS_DETECTED"
export type AcquisitionMarketSignalLevel = "INFO" | "POSITIVE" | "WARNING" | "CRITICAL"

export interface ComparableVehicle {
  readonly source: string
  readonly externalId: string
  readonly brand: string
  readonly model: string
  readonly trim: string | null
  readonly year: number | null
  readonly mileage: number | null
  readonly fuel: string | null
  readonly gearbox: string | null
  readonly powerDin: number | null
  readonly advertisedPrice: number
  readonly priceNature: "ASKING_PRICE"
  readonly location: string | null
  readonly postalCode?: string | null
  readonly latitude?: number | null
  readonly longitude?: number | null
  readonly sellerType: "PROFESSIONAL" | "PRIVATE" | "UNKNOWN"
  readonly publishedAt: string | null
  readonly collectedAt: string
  readonly url: string | null
  readonly dataQuality: number
  readonly description: string | null
  readonly imageUrls: readonly string[]
  readonly similarityScore: number
  readonly matchedCriteria: readonly string[]
  readonly importantDifferences: readonly string[]
  readonly selectionReason: string
}

export type AcquisitionPriceNature =
  | "ASKING_PRICE" | "DECLARED_PRICE" | "PURCHASE_PRICE"
  | "TRANSACTION_PRICE" | "ESTIMATED_PRICE"

export interface MarketSignal {
  readonly code: AcquisitionMarketSignalCode
  readonly level: AcquisitionMarketSignalLevel
  readonly explanation: string
}

export interface GeographicDistribution {
  readonly location: string
  readonly count: number
}

export interface AcquisitionMarketAnalysis {
  readonly comparableCount: number
  readonly minimumPrice: number | null
  readonly medianPrice: number | null
  readonly maximumPrice: number | null
  readonly averagePrice: number | null
  readonly priceDispersion: number | null
  readonly averageMileage: number | null
  readonly averageListingAgeDays: number | null
  readonly geographicDistribution: readonly GeographicDistribution[]
  readonly freshnessDays: number | null
  readonly confidence: AcquisitionMarketConfidence
  readonly marketScore: number
  readonly signals: readonly MarketSignal[]
  readonly comparables: readonly ComparableVehicle[]
  readonly outlierCount: number
  readonly providerAvailable: boolean
  readonly providerMessage: string | null
  readonly analyzedAt: string
  readonly geography: import("../geography/types").GeographicMarketAnalysis
}

export interface AcquisitionMarketQuery {
  readonly brand: string
  readonly model: string
  readonly trim: string | null
  readonly year: number | null
  readonly mileage: number | null
  readonly fuel: string | null
  readonly gearbox: string | null
  readonly location: string | null
  readonly postalCode: string | null
  readonly latitude: number | null
  readonly longitude: number | null
  readonly radiusKm: number | null
  readonly sellerType: "PROFESSIONAL" | "PRIVATE"
  readonly excludedUrls: readonly string[]
  readonly limit: number
}

export interface MarketProvider {
  readonly id: string
  search(query: AcquisitionMarketQuery, collectedAt: Date): Promise<readonly ComparableVehicle[]>
}

export interface MarketAnalysisContext {
  readonly comparableCount: number
  readonly medianPrice: number | null
  readonly priceRange: readonly [number | null, number | null]
  readonly confidence: AcquisitionMarketConfidence
  readonly marketScore: number
  readonly freshnessDays: number | null
  readonly signals: readonly {
    readonly code: AcquisitionMarketSignalCode
    readonly explanation: string
  }[]
  readonly comparableEvidence: readonly {
    readonly source: string
    readonly price: number
    readonly year: number | null
    readonly mileage: number | null
    readonly location: string | null
  }[]
  readonly geography: {
    readonly available: boolean
    readonly heatScore: number | null
    readonly localMedianPrice: number | null
    readonly nationalMedianPrice: number | null
    readonly localNationalDifferencePercent: number | null
    readonly signals: readonly {
      readonly code: import("../geography/types").LocalMarketSignalCode
      readonly explanation: string
    }[]
  }
}
