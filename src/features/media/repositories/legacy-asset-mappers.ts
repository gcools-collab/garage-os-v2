import type { Asset, AssetType, AssetVisibility } from "../types"

export interface VehicleImageAssetRecord {
  readonly id: string
  readonly garageId: string
  readonly vehicleId: string
  readonly storagePath: string
  readonly publicUrl: string
  readonly createdAt: string
  readonly isPrimary: boolean
  readonly position?: number | null
}

export interface VehicleDocumentAssetRecord {
  readonly id: string
  readonly garageId: string
  readonly vehicleId: string
  readonly storagePath: string
  readonly mimeType: string | null
  readonly sizeBytes: number | null
  readonly originalFilename: string
  readonly createdAt: string
}

const processing = {
  status: "READY",
  progress: 100,
  operation: null,
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
} as const

export function mapVehicleImageAsset(record: VehicleImageAssetRecord): Asset {
  return {
    id: record.id,
    garageId: record.garageId,
    vehicleId: record.vehicleId,
    type: "IMAGE",
    status: "READY",
    visibility: "PUBLIC",
    storageBucket: "vehicle-images",
    storagePath: record.storagePath,
    sourceUrl: record.publicUrl,
    variants: [{
      id: `${record.id}:original`,
      name: "original",
      storagePath: record.storagePath,
      url: record.publicUrl,
    }],
    metadata: { createdAt: record.createdAt },
    processing,
    position: record.position ?? null,
    manualOrder: record.position ?? null,
    isCover: record.isPrimary,
    isFeatured: record.isPrimary,
    collectionIds: [],
  }
}

function documentType(mime: string | null): AssetType {
  return mime === "application/pdf" ? "PDF" : "DOCUMENT"
}

export function mapVehicleDocumentAsset(
  record: VehicleDocumentAssetRecord,
  visibility: AssetVisibility = "SIGNED"
): Asset {
  return {
    id: record.id,
    garageId: record.garageId,
    vehicleId: record.vehicleId,
    type: documentType(record.mimeType),
    status: "READY",
    visibility,
    storageBucket: "vehicle-documents",
    storagePath: record.storagePath,
    sourceUrl: null,
    variants: [],
    metadata: {
      mime: record.mimeType ?? undefined,
      filesize: record.sizeBytes ?? undefined,
      createdAt: record.createdAt,
      alt: record.originalFilename,
    },
    processing,
    position: null,
    manualOrder: null,
    isCover: false,
    isFeatured: false,
    collectionIds: [],
  }
}
