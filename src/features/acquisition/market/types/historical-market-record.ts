export interface CanonicalHistoricalVehicle {
  readonly brand: string
  readonly model: string
  readonly trim: string | null
  readonly year: number | null
  readonly mileage: number | null
  readonly fuel: string | null
  readonly gearbox: string | null
}

export interface CanonicalHistoricalTransaction {
  readonly sourceSystem: string
  readonly sourceRecordId: string
  readonly garageReference: string | null
  readonly vehicle: CanonicalHistoricalVehicle
  readonly actualPurchasePrice: number | null
  readonly actualCosts: number | null
  readonly acquisitionChannel: string | null
  readonly purchasedAt: string | null
  readonly publishedAt: string | null
  readonly initialAskingPrice: number | null
  readonly priceReductions: readonly {
    readonly changedAt: string
    readonly previousPrice: number
    readonly newPrice: number
  }[]
  readonly soldAt: string | null
  readonly actualTransactionPrice: number | null
  readonly actualMargin: number | null
  readonly actualStockDays: number | null
}

export interface HistoricalMarketProvider {
  readonly id: string
  searchTransactions(vehicle: CanonicalHistoricalVehicle): Promise<readonly CanonicalHistoricalTransaction[]>
}
