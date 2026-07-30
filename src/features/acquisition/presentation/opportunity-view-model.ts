import type {
  AcquisitionDocumentCategory,
  AcquisitionStatus,
} from "../types/opportunity"

export interface AcquisitionListItemViewModel {
  readonly id: string
  readonly vehicle: string
  readonly seller: string
  readonly askingPrice: string
  readonly provenance: string
  readonly status: string
  readonly statusCode: AcquisitionStatus
  readonly createdAt: string
}

export interface AcquisitionDocumentViewModel {
  readonly id: string
  readonly category: AcquisitionDocumentCategory
  readonly categoryLabel: string
  readonly label: string
  readonly filename: string
  readonly createdAt: string
}

export interface AcquisitionDetailViewModel {
  readonly id: string
  readonly vehicleTitle: string
  readonly status: string
  readonly statusCode: AcquisitionStatus
  readonly allowedTransitions: readonly {
    readonly value: AcquisitionStatus
    readonly label: string
  }[]
  readonly seller: {
    readonly type: string
    readonly name: string
    readonly contact: string
    readonly city: string
  }
  readonly acquisition: {
    readonly askingPrice: string
    readonly repairEstimate: string
    readonly provenance: string
    readonly confidence: string
    readonly createdAt: string
  }
  readonly vehicle: readonly { readonly label: string; readonly value: string }[]
  readonly comments: string
  readonly documents: readonly AcquisitionDocumentViewModel[]
}
