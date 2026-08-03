export type MediaQualityState = "PASS" | "WARNING" | "BLOCKER" | "NOT_APPLICABLE"
export type MediaQualityConfidence = "LOW" | "MEDIUM" | "HIGH"
export type CaptureAngle = "FRONT_LEFT" | "FRONT" | "FRONT_RIGHT" | "RIGHT" | "REAR_RIGHT" | "REAR" | "REAR_LEFT" | "LEFT"

export interface MediaQualityItem {
  readonly id: string
  readonly position: number
  readonly url: string | null
  readonly width: number | null
  readonly height: number | null
  readonly fileSize: number | null
  readonly mimeType: string
  readonly hash: string | null
  readonly perceptualHash?: string | null
  readonly brightness?: number | null
  readonly histogram?: readonly number[]
  readonly hasExif?: boolean
  readonly variantNames?: readonly string[]
  readonly ready: boolean
}

export interface MediaQualityRuleResult {
  readonly id: string
  readonly label: string
  readonly state: Exclude<MediaQualityState, "NOT_APPLICABLE">
  readonly score: number
  readonly description: string
  readonly affectedItemIds: readonly string[]
}

export interface MediaQualityDeterministicAnalysis {
  readonly coverageScore: number
  readonly technicalScore: number
  readonly consistencyScore: number
  readonly score: number
  readonly rules: readonly MediaQualityRuleResult[]
  readonly blockers: readonly MediaQualityRuleResult[]
  readonly warnings: readonly MediaQualityRuleResult[]
  readonly strengths: readonly string[]
  readonly weaknesses: readonly string[]
  readonly capturedAngles: readonly CaptureAngle[]
  readonly missingAngles: readonly CaptureAngle[]
}

export interface MediaAiFinding {
  readonly fact: string
  readonly evidence: string
  readonly confidence: MediaQualityConfidence
  readonly suggestion: string
  readonly source: "AI"
  readonly itemId: string | null
}

export interface MediaAiInsight {
  readonly summary: string
  readonly score: number
  readonly findings: readonly MediaAiFinding[]
  readonly limitations: readonly string[]
  readonly provider: string
  readonly model: string
}

export interface MediaQualityWeights { readonly coverage: number; readonly technical: number; readonly consistency: number; readonly ai: number }
export interface MediaQualityReport {
  readonly score: number
  readonly grade: 1 | 2 | 3 | 4 | 5
  readonly state: MediaQualityState
  readonly title: string
  readonly summary: string
  readonly strengths: readonly string[]
  readonly weaknesses: readonly string[]
  readonly suggestions: readonly string[]
  readonly deterministic: MediaQualityDeterministicAnalysis
  readonly ai: MediaAiInsight | null
  readonly aiAvailable: boolean
}

export interface MediaQualityContext {
  readonly report: MediaQualityReport
  readonly analyzedItemCount: number
  readonly generatedAt: string
}

export type MediaQualityAnalyticsEvent = "MEDIA_ANALYSIS_STARTED" | "MEDIA_ANALYSIS_COMPLETED" | "MEDIA_WARNING_ACCEPTED" | "MEDIA_PHOTO_RETAKEN" | "MEDIA_SCORE_CHANGED"
