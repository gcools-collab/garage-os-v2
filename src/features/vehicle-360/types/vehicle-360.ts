import type { AssetImageViewModel } from "@/features/media"
import type { MediaQualityViewModel } from "@/features/media-quality/presentation"

export const VEHICLE_360_SEQUENCE_STATUSES = ["DRAFT", "PROCESSING", "READY", "PUBLISHED", "FAILED", "ARCHIVED"] as const
export const VEHICLE_360_FRAME_STATUSES = ["UPLOADING", "READY", "EXCLUDED", "FAILED"] as const
export type Vehicle360SequenceStatus = typeof VEHICLE_360_SEQUENCE_STATUSES[number]
export type Vehicle360FrameStatus = typeof VEHICLE_360_FRAME_STATUSES[number]
export type Vehicle360RuleState = "PASS" | "WARNING" | "BLOCKER"

export interface Vehicle360Frame {
  readonly id: string
  readonly garageId: string
  readonly vehicleId: string
  readonly sequenceId: string
  readonly storagePath: string
  readonly publicUrl: string | null
  readonly position: number
  readonly status: Vehicle360FrameStatus
  readonly width: number | null
  readonly height: number | null
  readonly fileSize: number | null
  readonly mimeType: string
  readonly checksum: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface Vehicle360Sequence {
  readonly id: string
  readonly garageId: string
  readonly vehicleId: string
  readonly status: Vehicle360SequenceStatus
  readonly frameCount: number
  readonly startFrameIndex: number | null
  readonly isPublic: boolean
  readonly createdBy: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly publishedAt: string | null
  readonly frames: readonly Vehicle360Frame[]
}

export interface Vehicle360CoverageRule {
  readonly id: string
  readonly label: string
  readonly state: Vehicle360RuleState
  readonly description: string
}

export interface Vehicle360CoverageViewModel {
  readonly score: number
  readonly ready: boolean
  readonly blockers: readonly Vehicle360CoverageRule[]
  readonly warnings: readonly Vehicle360CoverageRule[]
  readonly rules: readonly Vehicle360CoverageRule[]
  readonly summary: string
}

export interface Vehicle360ViewerFrameViewModel {
  readonly id: string
  readonly position: number
  readonly image: AssetImageViewModel
}

export interface Vehicle360ViewerViewModel {
  readonly sequenceId: string
  readonly label: string
  readonly instructions: string
  readonly frames: readonly Vehicle360ViewerFrameViewModel[]
  readonly startIndex: number
  readonly previousLabel: string
  readonly nextLabel: string
  readonly resetLabel: string
  readonly fullscreenLabel: string
  readonly unavailableMessage: string
}

export interface Vehicle360EditorViewModel {
  readonly sequenceId: string
  readonly vehicleId: string
  readonly statusLabel: string
  readonly frameCountLabel: string
  readonly publicLabel: string
  readonly updatedAtLabel: string
  readonly coverage: Vehicle360CoverageViewModel
  readonly viewer: Vehicle360ViewerViewModel | null
  readonly frames: readonly {
    readonly id: string
    readonly position: number
    readonly positionLabel: string
    readonly status: Vehicle360FrameStatus
    readonly isStart: boolean
    readonly imageUrl: string | null
  }[]
  readonly mediaQuality: MediaQualityViewModel
}

export interface Vehicle360PublicationViewModel {
  readonly available: boolean
  readonly published: boolean
  readonly state: "PASS" | "WARNING" | "NOT_APPLICABLE"
  readonly label: string
  readonly description: string
  readonly href: string | null
}

export type Vehicle360AnalyticsEvent =
  | "360_OPENED" | "360_STARTED" | "360_FRAME_CHANGED"
  | "360_COMPLETED" | "360_FULLSCREEN_OPENED"
