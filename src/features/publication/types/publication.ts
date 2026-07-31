import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"

export const publicationWorkflowStatuses = [
  "DRAFT",
  "IN_PREPARATION",
  "READY",
  "PUBLISHED",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
] as const

export type PublicationWorkflowStatus = (typeof publicationWorkflowStatuses)[number]
export type PublicationRuleState = "PASS" | "WARNING" | "BLOCKER" | "NOT_APPLICABLE"
export type PublicationSeverity = "SUCCESS" | "INFORMATION" | "WARNING" | "CRITICAL"

export interface PublicationRuleResult {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly state: PublicationRuleState
  readonly severity: PublicationSeverity
  readonly suggestedAction: string | null
  readonly href: string | null
  readonly order: number
}

export interface PublicationReadiness {
  readonly score: number
  readonly canPublish: boolean
  readonly passedCount: number
  readonly applicableCount: number
  readonly blockers: readonly PublicationRuleResult[]
  readonly warnings: readonly PublicationRuleResult[]
  readonly results: readonly PublicationRuleResult[]
}

export interface PublicationWorkspaceSource {
  readonly garage: PublicGarageContext
  readonly vehicle: LiveStockVehicle
  readonly garageActive: boolean
  readonly brandingConfigured: boolean
}

export type PublicationActionType = "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "REACTIVATE"

export interface PublicationActionContract {
  readonly type: PublicationActionType
  readonly label: string
  readonly enabled: boolean
  readonly confirmationTitle: string
  readonly confirmationDescription: string
  readonly targetStatus: PublicationWorkflowStatus
}

export type PublicationEventType =
  | "created"
  | "validated"
  | "published"
  | "unpublished"
  | "reserved"
  | "sold"
  | "archived"

export interface PublicationEvent {
  readonly id: string
  readonly type: PublicationEventType
  readonly occurredAt: string
  readonly description: string
}
