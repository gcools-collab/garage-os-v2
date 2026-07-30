export const ACQUISITION_STATUSES = [
  "NEW", "IN_REVIEW", "NEGOTIATING", "ACCEPTED", "PURCHASED",
  "REJECTED", "EXPIRED",
] as const
export type AcquisitionStatus = (typeof ACQUISITION_STATUSES)[number]

export const ACQUISITION_PROVENANCES = [
  "LEBONCOIN", "LA_CENTRALE", "MARKETPLACE", "CUSTOMER_TRADE_IN",
  "WALK_IN", "PROFESSIONAL_NETWORK", "DEALER", "AUCTION",
  "REFERRER", "OTHER",
] as const
export type AcquisitionProvenance = (typeof ACQUISITION_PROVENANCES)[number]

export const ACQUISITION_SELLER_TYPES = ["PRIVATE", "PROFESSIONAL"] as const
export type AcquisitionSellerType = (typeof ACQUISITION_SELLER_TYPES)[number]

export const ACQUISITION_CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const
export type AcquisitionConfidenceLevel = (typeof ACQUISITION_CONFIDENCE_LEVELS)[number]

export const ACQUISITION_CONDITIONS = [
  "EXCELLENT", "GOOD", "FAIR", "POOR", "UNKNOWN",
] as const
export type AcquisitionCondition = (typeof ACQUISITION_CONDITIONS)[number]

export const ACQUISITION_DOCUMENT_CATEGORIES = [
  "REGISTRATION_CERTIFICATE", "TECHNICAL_INSPECTION", "SERVICE_BOOK",
  "INVOICE", "PHOTO", "OTHER",
] as const
export type AcquisitionDocumentCategory =
  (typeof ACQUISITION_DOCUMENT_CATEGORIES)[number]

export interface AcquisitionSeller {
  readonly id: string
  readonly garageId: string
  readonly type: AcquisitionSellerType
  readonly name: string
  readonly phone: string | null
  readonly email: string | null
  readonly city: string | null
  readonly internalComments: string | null
}

export interface AcquisitionDocument {
  readonly id: string
  readonly category: AcquisitionDocumentCategory
  readonly label: string
  readonly originalFilename: string
  readonly storagePath: string
  readonly createdAt: string
}

export interface AcquisitionOpportunity {
  readonly id: string
  readonly garageId: string
  readonly creatorUserId: string
  readonly seller: AcquisitionSeller
  readonly status: AcquisitionStatus
  readonly provenance: AcquisitionProvenance
  readonly confidenceLevel: AcquisitionConfidenceLevel
  readonly registration: string | null
  readonly vin: string | null
  readonly brand: string
  readonly model: string
  readonly trim: string | null
  readonly year: number | null
  readonly fuel: string | null
  readonly gearbox: string | null
  readonly mileage: number | null
  readonly color: string | null
  readonly options: readonly string[]
  readonly generalCondition: AcquisitionCondition
  readonly askingPrice: number | null
  readonly repairEstimate: number | null
  readonly comments: string | null
  readonly sourceUrl: string | null
  readonly documents: readonly AcquisitionDocument[]
  readonly createdAt: string
  readonly updatedAt: string
}

export interface AcquisitionOpportunityInput {
  readonly sellerType: AcquisitionSellerType
  readonly sellerName: string
  readonly sellerPhone?: string
  readonly sellerEmail?: string
  readonly sellerCity?: string
  readonly sellerComments?: string
  readonly provenance: AcquisitionProvenance
  readonly confidenceLevel: AcquisitionConfidenceLevel
  readonly registration?: string
  readonly vin?: string
  readonly brand: string
  readonly model: string
  readonly trim?: string
  readonly year?: number
  readonly fuel?: string
  readonly gearbox?: string
  readonly mileage?: number
  readonly color?: string
  readonly options: readonly string[]
  readonly generalCondition: AcquisitionCondition
  readonly askingPrice?: number
  readonly repairEstimate?: number
  readonly comments?: string
  readonly sourceUrl?: string
}

export interface AcquisitionActionState {
  readonly success: boolean
  readonly message?: string
  readonly opportunityId?: string
  readonly errors?: Readonly<Record<string, readonly string[]>>
}
