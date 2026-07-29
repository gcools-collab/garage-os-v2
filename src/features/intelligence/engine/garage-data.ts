export type IntelligenceVehicleStatus =
  | "PURCHASED"
  | "PREPARATION"
  | "READY_TO_PUBLISH"
  | "PUBLISHED"
  | "RESERVED"
  | "SOLD"
  | "DELIVERED"
  | "ARCHIVED"
  | "CANCELLED"

export type GarageStockVehicle = {
  readonly id: string
  readonly label: string
  readonly status: IntelligenceVehicleStatus
  readonly purchasePrice: number | null
  readonly sellingPrice: number | null
  readonly costs: readonly number[]
  readonly createdAt: string
  readonly hasPhotos: boolean
  readonly hasDocuments: boolean
  readonly technicalInspectionDueAt: string | null
}

export type GarageMarketAnalysis = {
  readonly vehicleId: string
  readonly analyzedAt: string
  readonly position: "UNDER_MARKET" | "MARKET" | "OVER_MARKET" | "UNKNOWN"
}

export type GaragePreparation = {
  readonly id: string
  readonly vehicleId: string
  readonly label: string
  readonly dueAt: string
  readonly completed: boolean
}

export type GarageSale = {
  readonly id: string
  readonly vehicleId: string
  readonly soldAt: string
  readonly sellingPrice: number
}

export type GarageActivity = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly occurredAt: string
  readonly kind: "STOCK" | "PREPARATION" | "MARKET" | "SALE"
}

export type GarageIntelligenceData = {
  readonly garageName: string
  readonly userFirstName: string
  readonly referenceDate: string
  readonly stock: readonly GarageStockVehicle[]
  readonly marketAnalyses: readonly GarageMarketAnalysis[]
  readonly preparations: readonly GaragePreparation[]
  readonly sales: readonly GarageSale[]
  readonly activities: readonly GarageActivity[]
}
