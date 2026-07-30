export const ASSET_TYPES = [
  "IMAGE",
  "VIDEO",
  "DOCUMENT",
  "PDF",
  "YOUTUBE",
  "THREE_SIXTY_SEQUENCE",
  "PANORAMA",
  "HOTSPOT",
  "AI_IMAGE",
  "AI_REPORT",
] as const

export type AssetType = typeof ASSET_TYPES[number]
export type AssetStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED" | "ARCHIVED"
export type AssetVisibility = "PUBLIC" | "PRIVATE" | "SIGNED" | "TENANT" | "DRAFT" | "PUBLISHED"
export type AssetOrientation = "LANDSCAPE" | "PORTRAIT" | "SQUARE" | "UNKNOWN"

export interface AssetGpsMetadata {
  readonly latitude: number
  readonly longitude: number
  readonly altitude?: number
}

export interface AssetMetadata {
  readonly width?: number
  readonly height?: number
  readonly filesize?: number
  readonly mime?: string
  readonly hash?: string
  readonly createdAt?: string
  readonly updatedAt?: string
  readonly alt?: string
  readonly caption?: string
  readonly dominantColor?: string
  readonly blurHash?: string
  readonly orientation?: AssetOrientation
  readonly gps?: AssetGpsMetadata
  readonly camera?: string
  readonly duration?: number
}

export interface AssetVariant {
  readonly id: string
  readonly name: string
  readonly storagePath: string
  readonly url: string | null
  readonly width?: number
  readonly height?: number
  readonly filesize?: number
  readonly mime?: string
  readonly pixelDensity?: number
}

export interface AssetProcessing {
  readonly status: AssetStatus
  readonly progress: number | null
  readonly operation: string | null
  readonly errorCode: string | null
  readonly errorMessage: string | null
  readonly startedAt: string | null
  readonly completedAt: string | null
}

export interface Asset {
  readonly id: string
  readonly garageId: string
  readonly vehicleId: string | null
  readonly type: AssetType
  readonly status: AssetStatus
  readonly visibility: AssetVisibility
  readonly storageBucket: string | null
  readonly storagePath: string | null
  readonly sourceUrl: string | null
  readonly variants: readonly AssetVariant[]
  readonly metadata: AssetMetadata
  readonly processing: AssetProcessing
  readonly position: number | null
  readonly manualOrder: number | null
  readonly isCover: boolean
  readonly isFeatured: boolean
  readonly collectionIds: readonly string[]
}

export interface AssetCollection {
  readonly id: string
  readonly garageId: string
  readonly vehicleId: string | null
  readonly label: string
  readonly assetIds: readonly string[]
  readonly position: number
}

export interface VehicleAssetGallery {
  readonly vehicleId: string
  readonly cover: Asset
  readonly gallery: readonly Asset[]
  readonly featured: readonly Asset[]
  readonly orderedAssets: readonly Asset[]
}
