export type PersistedMarketAnalysis = {
  readonly id: string
  readonly comparableCount: number
  readonly minimumPrice: number | null
  readonly maximumPrice: number | null
  readonly averagePrice: number | null
  readonly medianPrice: number | null
  readonly currentVehiclePrice: number | null
  readonly priceDifference: number | null
  readonly priceDifferencePercent: number | null
  readonly positioning: "BELOW_MARKET" | "IN_MARKET" | "ABOVE_MARKET" | null
  readonly analyzedAt: string
  readonly provider: string
}

export type GarageMarketDashboardRecord = {
  readonly garageId: string
  readonly vehicles: readonly {
    readonly id: string
    readonly brand: string
    readonly model: string
    readonly trim: string | null
    readonly year: number | null
    readonly mileage: number | null
    readonly fuel: string | null
    readonly gearbox: string | null
    readonly sellingPrice: number | null
    readonly primaryImageUrl: string | null
    readonly analysis: PersistedMarketAnalysis | null
  }[]
}
