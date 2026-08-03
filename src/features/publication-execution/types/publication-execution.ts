import type { PublicationWorkflowStatus } from "@/features/publication"
import type { PublicationTargetResult } from "@/features/publication-targets"

export const publicationExecutionActions = [
  "MARK_READY",
  "PUBLISH",
  "UNPUBLISH",
  "RESERVE",
  "SELL",
  "ARCHIVE",
] as const

export type PublicationExecutionAction = (typeof publicationExecutionActions)[number]
export type PublicationExecutionEventType =
  | "VALIDATED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "RESERVED"
  | "SOLD"
  | "ARCHIVED"

export interface PublicationExecutionEvent {
  readonly type: PublicationExecutionEventType
  readonly vehicleId: string
  readonly garageId: string
  readonly actorId: string
  readonly previousStatus: PublicationWorkflowStatus
  readonly nextStatus: PublicationWorkflowStatus
  readonly occurredAt: string
  readonly description: string
  readonly metadata: Readonly<Record<string, string>>
}

export interface PublicationPersistenceCommand {
  readonly vehicleId: string
  readonly garageId: string
  readonly expectedVehicleStatus: string
  readonly targetVehicleStatus: string
  readonly publicationStatus: "DRAFT" | "PUBLISHED" | "UNPUBLISHED"
  readonly publishedAt: string | null
  readonly eventDatabaseType: string
  readonly event: PublicationExecutionEvent
}

export interface PublicationExecutionResult {
  readonly success: boolean
  readonly code:
    | "SUCCESS"
    | "INVALID_TRANSITION"
    | "VALIDATION_FAILED"
    | "FORBIDDEN"
    | "PROVIDER_ERROR"
    | "PERSISTENCE_ERROR"
  readonly message: string
  readonly vehicleId: string
  readonly previousStatus: PublicationWorkflowStatus
  readonly nextStatus: PublicationWorkflowStatus | null
  readonly event: PublicationExecutionEvent | null
  readonly providerResult: PublicationTargetResult | null
}

export interface PublicationExecutionActionState {
  readonly status: "IDLE" | "SUCCESS" | "ERROR"
  readonly message: string | null
}
