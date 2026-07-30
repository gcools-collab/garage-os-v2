import type { GarageRecommendation, GarageIntelligenceSnapshot } from "@/features/intelligence"

export const COPILOT_INTENTS = [
  "DAILY_PRIORITIES", "COMMERCIAL_OVERVIEW", "LEAD_ANALYSIS", "VEHICLE_ANALYSIS",
  "STOCK_OVERVIEW", "PRICING_ANALYSIS", "PUBLICATION_ANALYSIS", "ACQUISITION_ANALYSIS",
  "PROFITABILITY_OVERVIEW", "RECOMMENDATION_EXPLANATION",
  "GENERAL_GARAGE_QUESTION", "UNSUPPORTED",
] as const
export type CopilotIntent = typeof COPILOT_INTENTS[number]
export type CopilotMessageRole = "USER" | "ASSISTANT" | "SYSTEM"
export type CopilotMessageStatus = "PENDING" | "COMPLETED" | "FAILED" | "BLOCKED"
export type CopilotEntityType =
  | "LEAD" | "VEHICLE" | "COMMERCIAL_TASK" | "RECOMMENDATION"
  | "ACQUISITION_OPPORTUNITY" | "NOTIFICATION"

export type CopilotConfig = {
  readonly provider: "openai-compatible"
  readonly model: string
  readonly temperature: number
  readonly maxOutputTokens: number
  readonly maxConversationMessages: number
  readonly maxContextCharacters: number
  readonly maxRecommendations: number
  readonly maxVehicles: number
  readonly maxLeads: number
  readonly maxTasks: number
  readonly maxMarketComparisons: number
  readonly timeoutMs: number
  readonly dailyGarageRequestLimit: number
  readonly hourlyUserRequestLimit: number
  readonly retentionDays: number
  readonly allowedGeneralKnowledge: boolean
  readonly enablePersistence: boolean
  readonly enableStreaming: boolean
}

export type CopilotReference = {
  readonly entityType: CopilotEntityType
  readonly entityId: string
  readonly label: string
  readonly href: string
}

export type CopilotSuggestedAction = {
  readonly type:
    | "OPEN_LEAD" | "OPEN_VEHICLE" | "OPEN_COMMERCIAL" | "OPEN_INTELLIGENCE"
    | "OPEN_NOTIFICATION" | "OPEN_ACQUISITION_OPPORTUNITY"
    | "OPEN_BRANDING_SETTINGS" | "OPEN_VEHICLE_EDIT"
  readonly label: string
  readonly href: string
  readonly requiresConfirmation: boolean
}

export type CopilotStructuredResponse = {
  readonly answer: string
  readonly summary: string | null
  readonly confidence: "HIGH" | "MEDIUM" | "LOW"
  readonly dataStatus: "SUFFICIENT" | "PARTIAL" | "INSUFFICIENT"
  readonly references: readonly CopilotReference[]
  readonly suggestedActions: readonly CopilotSuggestedAction[]
  readonly warnings: readonly string[]
  readonly followUpSuggestions: readonly string[]
}

export type CopilotConversation = {
  readonly id: string
  readonly garageId: string
  readonly createdByUserId: string
  readonly title: string | null
  readonly status: "ACTIVE" | "ARCHIVED"
  readonly lastMessageAt: string | null
  readonly createdAt: string
}

export type CopilotMessage = {
  readonly id: string
  readonly conversationId: string
  readonly role: CopilotMessageRole
  readonly status: CopilotMessageStatus
  readonly content: string
  readonly structuredPayload: CopilotStructuredResponse | null
  readonly createdAt: string
}

export type CopilotUsageSummary = {
  readonly inputTokens: number | null
  readonly outputTokens: number | null
}

export type CopilotProviderInput = {
  readonly systemPrompt: string
  readonly messages: readonly { readonly role: "user" | "assistant"; readonly content: string }[]
  readonly context: string
  readonly responseSchema: string
  readonly temperature: number
  readonly maxTokens: number
  readonly timeoutMs: number
}

export type CopilotProviderResult = {
  readonly content: string
  readonly structuredResponse: unknown
  readonly usage: CopilotUsageSummary
  readonly provider: string
  readonly model: string
  readonly finishReason: string | null
  readonly latencyMs: number
}

export interface CopilotProvider {
  generateResponse(input: CopilotProviderInput): Promise<CopilotProviderResult>
}

export type CopilotGarageContextSnapshot = {
  readonly garage: { readonly id: string; readonly name: string; readonly timezone: string }
  readonly generatedAt: string
  readonly intelligenceBrief: {
    readonly summary: string
    readonly recommendations: readonly GarageRecommendation[]
  }
  readonly commercialSummary: {
    readonly activeLeads: number
    readonly uncontactedLeads: number
    readonly overdueTasks: number
  }
  readonly stockSummary: {
    readonly vehicleCount: number
    readonly stockValueCents: number
    readonly capitalInvestedCents: number
    readonly potentialMarginCents: number
  }
  readonly selectedEntities: {
    readonly vehicles: readonly GarageIntelligenceSnapshot["vehicles"][number][]
    readonly leads: readonly GarageIntelligenceSnapshot["leads"][number][]
    readonly tasks: readonly GarageIntelligenceSnapshot["commercialTasks"][number][]
    readonly recommendations: readonly GarageRecommendation[]
  }
}

export type CopilotIntentResolution = {
  readonly intent: CopilotIntent
  readonly confidence: "HIGH" | "MEDIUM" | "LOW"
}

export type CopilotMessageViewModel = {
  readonly id: string
  readonly role: "user" | "assistant"
  readonly text: string
  readonly status: CopilotMessageStatus
  readonly references: readonly CopilotReference[]
  readonly actions: readonly CopilotSuggestedAction[]
  readonly warnings: readonly string[]
  readonly followUpSuggestions: readonly string[]
  readonly createdAtLabel: string
  readonly canRetry: boolean
}

export type CopilotConversationViewModel = {
  readonly id: string | null
  readonly title: string
  readonly messages: readonly CopilotMessageViewModel[]
  readonly suggestions: readonly string[]
  readonly contextGeneratedAtLabel: string | null
}

export type CopilotConversationListViewModel = {
  readonly conversations: readonly {
    readonly id: string
    readonly title: string
    readonly href: string
    readonly dateLabel: string
  }[]
}

export type CopilotActionResult =
  | { readonly success: true; readonly conversationId: string; readonly message?: CopilotMessageViewModel }
  | { readonly success: false; readonly error: string; readonly code: string }
