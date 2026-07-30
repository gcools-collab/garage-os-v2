import type { Asset, AssetProcessing, AssetStatus } from "../types"

export const ASSET_PROCESSING_OPERATIONS = [
  "COMPRESSION",
  "RESIZE",
  "WEBP",
  "AVIF",
  "WATERMARK",
  "BACKGROUND_REMOVAL",
  "AI_ENHANCEMENT",
  "THREE_SIXTY_STITCHING",
  "THUMBNAIL_GENERATION",
] as const

export type AssetProcessingOperation = typeof ASSET_PROCESSING_OPERATIONS[number]

export const ASSET_PROCESSING_TRANSITIONS: Readonly<Record<AssetStatus, readonly AssetStatus[]>> = {
  UPLOADING: ["PROCESSING", "FAILED", "ARCHIVED"],
  PROCESSING: ["READY", "FAILED", "ARCHIVED"],
  READY: ["PROCESSING", "ARCHIVED"],
  FAILED: ["PROCESSING", "ARCHIVED"],
  ARCHIVED: [],
}

export interface AssetProcessor {
  readonly id: string
  readonly operations: readonly AssetProcessingOperation[]
  supports(asset: Asset): boolean
  process(asset: Asset, operation: AssetProcessingOperation): Promise<Asset>
}

export interface AssetProcessingPipeline {
  enqueue(asset: Asset, operations: readonly AssetProcessingOperation[]): Promise<AssetProcessing>
}

export function canTransitionAssetStatus(from: AssetStatus, to: AssetStatus) {
  return ASSET_PROCESSING_TRANSITIONS[from].includes(to)
}

export function createPendingProcessing(
  operation: AssetProcessingOperation,
  now: Date
): AssetProcessing {
  return {
    status: "PROCESSING",
    progress: 0,
    operation,
    errorCode: null,
    errorMessage: null,
    startedAt: now.toISOString(),
    completedAt: null,
  }
}
