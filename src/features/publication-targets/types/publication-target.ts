import type { PublicationWorkspaceSource } from "@/features/publication"

export const publicationTargetCapabilities = [
  "PHOTOS",
  "VIDEO",
  "360",
  "PRICE",
  "DESCRIPTION",
  "EQUIPMENT",
  "SEO",
  "CONTACT",
  "FINANCING",
  "REPRISE",
] as const

export type PublicationTargetCapability = (typeof publicationTargetCapabilities)[number]

export const publicationTargetIds = [
  "PUBLIC_WEBSITE",
  "LEBONCOIN",
  "LA_CENTRALE",
  "FACEBOOK_MARKETPLACE",
  "INSTAGRAM",
  "PARTNER_API",
] as const

export type PublicationTargetId = (typeof publicationTargetIds)[number]
export type PublicationTargetStatus =
  | "NOT_CONFIGURED"
  | "READY"
  | "PUBLISHED"
  | "OUTDATED"
  | "ERROR"
  | "NOT_IMPLEMENTED"

export type PublicationTargetHealth = "ONLINE" | "OFFLINE" | "DEGRADED" | "UNKNOWN"
export type PublicationTargetValidationState = "PASS" | "WARNING" | "BLOCKER"
export type PublicationTargetOperation = "PUBLISH" | "UPDATE" | "UNPUBLISH"

export interface PublicationTarget {
  readonly id: PublicationTargetId
  readonly name: string
  readonly description: string
  readonly status: PublicationTargetStatus
  readonly capabilities: readonly PublicationTargetCapability[]
}

export interface PublicationTargetValidation {
  readonly id: string
  readonly label: string
  readonly state: PublicationTargetValidationState
  readonly message: string
}

export interface PublicationTargetPreview {
  readonly targetId: PublicationTargetId
  readonly targetName: string
  readonly status: PublicationTargetStatus
  readonly simulatedUrl: string | null
  readonly title: string
  readonly cover: { readonly url: string; readonly alt: string } | null
  readonly description: string
  readonly capabilities: readonly PublicationTargetCapability[]
}

export interface PublicationTargetResult {
  readonly targetId: PublicationTargetId
  readonly operation: PublicationTargetOperation
  readonly success: boolean
  readonly code: "SUCCESS" | "VALIDATION_FAILED" | "NOT_IMPLEMENTED" | "PROVIDER_ERROR"
  readonly message: string
  readonly externalUrl: string | null
}

export interface PublicationTargetJob {
  readonly id: string
  readonly targetId: PublicationTargetId
  readonly vehicleId: string
  readonly operation: PublicationTargetOperation
  readonly status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED"
  readonly createdAt: string
  readonly completedAt: string | null
  readonly result: PublicationTargetResult | null
}

export interface PublicationTargetProviderContext {
  readonly source: PublicationWorkspaceSource
}

export interface PublicationTargetAnalysis {
  readonly target: PublicationTarget
  readonly health: PublicationTargetHealth
  readonly validations: readonly PublicationTargetValidation[]
  readonly preview: PublicationTargetPreview
  readonly canPublish: boolean
  readonly missingCapabilities: readonly PublicationTargetCapability[]
}
