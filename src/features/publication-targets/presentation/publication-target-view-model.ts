import type {
  PublicationTargetCapability,
  PublicationTargetHealth,
  PublicationTargetId,
  PublicationTargetStatus,
  PublicationTargetValidationState,
} from "../types"

export interface PublicationTargetValidationViewModel {
  readonly id: string
  readonly label: string
  readonly state: PublicationTargetValidationState
  readonly stateLabel: string
  readonly message: string
}

export interface PublicationTargetViewModel {
  readonly id: PublicationTargetId
  readonly name: string
  readonly description: string
  readonly status: PublicationTargetStatus
  readonly statusLabel: string
  readonly health: PublicationTargetHealth
  readonly healthLabel: string
  readonly canPublish: boolean
  readonly preview: {
    readonly url: string | null
    readonly title: string
    readonly cover: { readonly url: string; readonly alt: string } | null
    readonly description: string
  }
  readonly capabilities: readonly {
    readonly id: PublicationTargetCapability
    readonly label: string
    readonly supported: boolean
  }[]
  readonly validations: readonly PublicationTargetValidationViewModel[]
}

export interface PublicationTargetsViewModel {
  readonly targets: readonly PublicationTargetViewModel[]
  readonly summary: string
  readonly publishableCount: number
}
