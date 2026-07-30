export const COPILOT_ACTION_TYPES = [
  "OPEN_ENTITY", "CREATE_TASK", "CHANGE_PRICE", "CHANGE_STATUS", "MARK_CONTACTED",
] as const
export type CopilotActionType = typeof COPILOT_ACTION_TYPES[number]
export type CopilotActionConfidence = "LOW" | "MEDIUM" | "HIGH"
export type CopilotActionStatus = "PROPOSED" | "EXECUTED" | "CANCELLED" | "REJECTED"
export type CopilotActionTargetType = "VEHICLE" | "LEAD" | "COMMERCIAL_TASK"

export type CopilotActionProposal = {
  readonly id: string
  readonly action: CopilotActionType
  readonly targetId: string
  readonly payload: unknown
  readonly explanation: string
  readonly confidence: CopilotActionConfidence
}

export type CopilotActionProposalInput = Omit<CopilotActionProposal, "id">

export type CopilotActionTargetSnapshot = {
  readonly id: string
  readonly garageId: string
  readonly type: CopilotActionTargetType
  readonly label: string
  readonly href: string
  readonly version: string
  readonly currentPrice?: number | null
  readonly currentStatus?: string
  readonly firstContactedAt?: string | null
  readonly leadId?: string | null
  readonly vehicleId?: string | null
}

export type CopilotActionSummary = {
  readonly title: string
  readonly targetLabel: string
  readonly explanation: string
  readonly confidenceLabel: string
  readonly details: readonly {
    readonly label: string
    readonly before: string | null
    readonly after: string
  }[]
}

export type CopilotActionLog = {
  readonly id: string
  readonly garageId: string
  readonly userId: string
  readonly conversationId: string
  readonly action: CopilotActionType
  readonly targetType: CopilotActionTargetType
  readonly targetId: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly targetSnapshot: CopilotActionTargetSnapshot
  readonly explanation: string
  readonly confidence: CopilotActionConfidence
  readonly status: CopilotActionStatus
  readonly createdAt: string
  readonly resolvedAt: string | null
}

export type CopilotActionProposalViewModel = {
  readonly id: string
  readonly action: CopilotActionType
  readonly status: CopilotActionStatus
  readonly statusLabel: string
  readonly summary: CopilotActionSummary
  readonly requiresConfirmation: boolean
  readonly navigationHref: string | null
  readonly canConfirm: boolean
  readonly canCancel: boolean
}

export type CopilotActionResult =
  | {
      readonly success: true
      readonly proposal: CopilotActionProposalViewModel
      readonly message: string
    }
  | { readonly success: false; readonly error: string; readonly code: string }

export type CopilotActionRegistryEntry = {
  readonly action: CopilotActionType
  readonly targetType: CopilotActionTargetType | "ANY"
  readonly requiresConfirmation: boolean
  readonly permission: "MEMBER"
  readonly executeKey: CopilotActionType
}
