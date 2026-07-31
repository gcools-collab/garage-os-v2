import type {
  PublicationActionContract,
  PublicationRuleState,
  PublicationSeverity,
  PublicationWorkflowStatus,
} from "../types"

export interface PublicationChecklistItemViewModel {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly state: PublicationRuleState
  readonly stateLabel: string
  readonly severity: PublicationSeverity
  readonly actionLabel: string | null
  readonly href: string | null
}

export interface PublicationPreviewViewModel {
  readonly publicUrl: string
  readonly vehicleTitle: string
  readonly price: string
  readonly cover: {
    readonly url: string
    readonly alt: string
  } | null
  readonly available: boolean
}

export interface PublicationSeoPreviewViewModel {
  readonly title: string
  readonly description: string
  readonly slug: string
  readonly canonicalPath: string
  readonly openGraphImage: string | null
}

export interface PublicationWorkspaceViewModel {
  readonly vehicleId: string
  readonly title: string
  readonly subtitle: string
  readonly backHref: string
  readonly workflow: {
    readonly status: PublicationWorkflowStatus
    readonly label: string
    readonly description: string
  }
  readonly readiness: {
    readonly score: number
    readonly color: "RED" | "ORANGE" | "GREEN"
    readonly progressLabel: string
    readonly summary: string
    readonly canPublish: boolean
    readonly statusAnnouncement: string
  }
  readonly checklist: readonly PublicationChecklistItemViewModel[]
  readonly blockers: readonly PublicationChecklistItemViewModel[]
  readonly warnings: readonly PublicationChecklistItemViewModel[]
  readonly publicPreview: PublicationPreviewViewModel
  readonly seoPreview: PublicationSeoPreviewViewModel
  readonly actions: readonly PublicationActionContract[]
}
