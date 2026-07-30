export const INTELLIGENCE_SIGNAL_CATEGORIES = [
  "COMMERCIAL", "STOCK", "PRICING", "PUBLICATION",
  "APPOINTMENT", "ACQUISITION", "PROFITABILITY", "DATA_QUALITY",
] as const
export type IntelligenceSignalCategory = typeof INTELLIGENCE_SIGNAL_CATEGORIES[number]

export const INTELLIGENCE_SIGNAL_TYPES = [
  "LEAD_UNCONTACTED", "LEAD_FOLLOW_UP_OVERDUE", "COMMERCIAL_TASK_OVERDUE",
  "APPOINTMENT_UNCONFIRMED", "ACTIVE_LEAD_VEHICLE_UNAVAILABLE",
  "VEHICLE_AGING", "VEHICLE_STAGNATING", "HIGH_CAPITAL_IMMOBILIZATION",
  "VEHICLE_WITHOUT_RECENT_ACTIVITY", "VEHICLE_ABOVE_MARKET",
  "VEHICLE_BELOW_MARKET", "PRICE_NOT_REVIEWED", "LOW_MARKET_CONFIDENCE",
  "READY_NOT_PUBLISHED", "INCOMPLETE_PUBLICATION", "MISSING_PHOTOS",
  "MISSING_DESCRIPTION", "ACQUISITION_OPPORTUNITY", "HIGH_MARGIN_OPPORTUNITY",
  "UNDERPRICED_MARKET_LISTING", "LOW_ESTIMATED_MARGIN",
  "PREPARATION_COST_TOO_HIGH", "MARGIN_AT_RISK",
] as const
export type IntelligenceSignalType = typeof INTELLIGENCE_SIGNAL_TYPES[number]

export type IntelligenceSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
export type RecommendationImpact = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW"
export type RecommendationUrgency = "IMMEDIATE" | "TODAY" | "SOON" | "WHEN_POSSIBLE"
export type RecommendationEffort = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH"
export type RecommendationConfidence = "HIGH" | "MEDIUM" | "LOW"

export const GARAGE_RECOMMENDATION_TYPES = [
  "CONTACT_LEAD", "FOLLOW_UP_LEAD", "CONFIRM_APPOINTMENT", "COMPLETE_TASK",
  "REVIEW_VEHICLE_PRICE", "REDUCE_VEHICLE_PRICE", "COMPLETE_VEHICLE_LISTING",
  "PUBLISH_VEHICLE", "REVIEW_AGING_VEHICLE", "REVIEW_LOW_MARGIN_VEHICLE",
  "REVIEW_ACQUISITION_OPPORTUNITY", "VERIFY_VEHICLE_AVAILABILITY",
] as const
export type GarageRecommendationType = typeof GARAGE_RECOMMENDATION_TYPES[number]

export const INTELLIGENCE_RECOMMENDATION_STATUSES = [
  "ACTIVE", "COMPLETED", "DISMISSED", "SNOOZED", "RESOLVED",
] as const
export type IntelligenceRecommendationStatus = typeof INTELLIGENCE_RECOMMENDATION_STATUSES[number]

export type IntelligenceMarketPosition = {
  readonly comparableCount: number
  readonly averagePriceCents: number | null
  readonly medianPriceCents: number | null
  readonly minimumPriceCents: number | null
  readonly maximumPriceCents: number | null
  readonly priceDifferenceCents: number | null
  readonly priceDifferencePercent: number | null
  readonly confidence: RecommendationConfidence
  readonly analyzedAt: string
}

export type IntelligenceVehicleSnapshot = {
  readonly id: string
  readonly liveSlug: string | null
  readonly title: string
  readonly status: string
  readonly publicationStatus: string
  readonly priceCents: number | null
  readonly purchasePriceCents: number | null
  readonly preparationCostCents: number
  readonly estimatedMarginCents: number | null
  readonly capitalInvestedCents: number
  readonly daysInStock: number
  readonly daysPublished: number | null
  readonly photoCount: number
  readonly hasDescription: boolean
  readonly completenessScore: number
  readonly publishedAt: string | null
  readonly lastPriceChangeAt: string | null
  readonly updatedAt: string
  readonly marketPosition: IntelligenceMarketPosition | null
  readonly leadCount: number
  readonly recentLeadCount: number
  readonly vehicleUrl: string | null
  readonly dashboardUrl: string
}

export type IntelligenceLeadSnapshot = {
  readonly id: string
  readonly customerName: string
  readonly status: string
  readonly type: string
  readonly vehicleId: string | null
  readonly vehicleTitle: string
  readonly createdAt: string
  readonly firstContactedAt: string | null
  readonly lastContactedAt: string | null
  readonly preferredDate: string | null
  readonly nextActionAt: string | null
  readonly href: string
}

export type IntelligenceCommercialTaskSnapshot = {
  readonly id: string
  readonly leadId: string | null
  readonly vehicleId: string | null
  readonly type: string
  readonly status: string
  readonly title: string
  readonly dueAt: string | null
  readonly snoozedUntil: string | null
  readonly href: string
}

export type IntelligenceAcquisitionOpportunitySnapshot = {
  readonly id: string
  readonly title: string
  readonly askingPriceCents: number
  readonly marketMedianCents: number
  readonly estimatedMarginCents: number
  readonly comparableCount: number
  readonly confidence: RecommendationConfidence
  readonly listedAt: string
  readonly href: string
}

export type PersistedRecommendationSnapshot = {
  readonly id: string
  readonly recommendationKey: string
  readonly type: GarageRecommendationType
  readonly category: IntelligenceSignalCategory
  readonly entityType: IntelligenceSignal["entityType"] | null
  readonly entityId: string | null
  readonly score: number
  readonly payload: Readonly<Record<string, unknown>>
  readonly status: IntelligenceRecommendationStatus
  readonly snoozedUntil: string | null
  readonly dismissedAt: string | null
  readonly lastDetectedAt: string
}

export type GarageIntelligenceSnapshot = {
  readonly garage: {
    readonly id: string
    readonly name: string
    readonly timezone: string
  }
  readonly generatedAt: string
  readonly vehicles: readonly IntelligenceVehicleSnapshot[]
  readonly leads: readonly IntelligenceLeadSnapshot[]
  readonly commercialTasks: readonly IntelligenceCommercialTaskSnapshot[]
  readonly acquisitionOpportunities: readonly IntelligenceAcquisitionOpportunitySnapshot[]
  readonly previousRecommendations: readonly PersistedRecommendationSnapshot[]
  readonly metrics: {
    readonly stockValueCents: number
    readonly capitalInvestedCents: number
    readonly potentialMarginCents: number
  }
}

export type IntelligenceSignal = {
  readonly id: string
  readonly type: IntelligenceSignalType
  readonly category: IntelligenceSignalCategory
  readonly severity: IntelligenceSeverity
  readonly entityType: "lead" | "commercial_task" | "vehicle" | "acquisition_opportunity"
  readonly entityId: string
  readonly title: string
  readonly facts: Readonly<Record<string, string | number | boolean | null>>
  readonly detectedAt: string
  readonly expiresAt: string | null
}

export type GarageRecommendation = {
  readonly recommendationKey: string
  readonly type: GarageRecommendationType
  readonly category: IntelligenceSignalCategory
  readonly entityType: IntelligenceSignal["entityType"]
  readonly entityId: string
  readonly action: string
  readonly subject: string
  readonly impact: RecommendationImpact
  readonly urgency: RecommendationUrgency
  readonly effort: RecommendationEffort
  readonly effortMinutes: number
  readonly confidence: RecommendationConfidence
  readonly score: number
  readonly scoreBreakdown: {
    readonly impact: number
    readonly urgency: number
    readonly confidence: number
    readonly effortPenalty: number
    readonly agingBonus: number
    readonly categoryBonus: number
  }
  readonly reasons: readonly string[]
  readonly evidence: readonly string[]
  readonly href: string
  readonly createdAt: string
  readonly expiresAt: string | null
  readonly sourceSignalIds: readonly string[]
  readonly status: IntelligenceRecommendationStatus
  readonly snoozedUntil: string | null
}

export type PriceRecommendation = {
  readonly kind: "REDUCE" | "REVIEW" | "KEEP" | "INSUFFICIENT_DATA"
  readonly suggestedPriceCents: number | null
  readonly suggestedChangeCents: number | null
  readonly confidence: RecommendationConfidence
  readonly reasons: readonly string[]
}

export type AcquisitionOpportunityScore = {
  readonly score: number
  readonly level: "HIGH" | "MEDIUM" | "LOW"
  readonly reasons: readonly string[]
  readonly estimatedMarginCents: number
  readonly confidence: RecommendationConfidence
}

export type IntelligenceRecommendationRecord = {
  readonly id: string
  readonly garage_id: string
  readonly recommendation_key: string
  readonly type: GarageRecommendationType
  readonly category: IntelligenceSignalCategory
  readonly entity_type: GarageRecommendation["entityType"] | null
  readonly entity_id: string | null
  readonly status: IntelligenceRecommendationStatus
  readonly score: number
  readonly payload: Readonly<Record<string, unknown>>
  readonly first_detected_at: string
  readonly last_detected_at: string
  readonly resolved_at: string | null
  readonly dismissed_at: string | null
  readonly snoozed_until: string | null
  readonly created_at: string
  readonly updated_at: string
}

export type GarageRecommendationViewModel = {
  readonly id: string
  readonly rank: number
  readonly category: IntelligenceSignalCategory
  readonly categoryLabel: string
  readonly action: string
  readonly subject: string
  readonly primaryReason: string
  readonly secondaryReasons: readonly string[]
  readonly impactLabel: string
  readonly urgencyLabel: string
  readonly effortLabel: string
  readonly confidenceLabel: string
  readonly evidence: readonly string[]
  readonly href: string
  readonly ctaLabel: string
  readonly status: IntelligenceRecommendationStatus
  readonly statusLabel: string
  readonly snoozedUntilLabel: string | null
}

export type GarageDailyBriefViewModel = {
  readonly greeting: string
  readonly generatedAtLabel: string
  readonly headline: string
  readonly summary: string
  readonly topRecommendations: readonly GarageRecommendationViewModel[]
  readonly recommendations: readonly GarageRecommendationViewModel[]
  readonly categorySummaries: readonly {
    readonly category: IntelligenceSignalCategory
    readonly label: string
    readonly count: number
  }[]
  readonly metrics: {
    readonly activeActions: number
    readonly urgentActions: number
    readonly uncontactedLeads: number
    readonly overdueTasks: number
    readonly appointmentsToConfirm: number
    readonly agingVehicles: number
    readonly aboveMarketVehicles: number
    readonly unpublishedVehicles: number
    readonly acquisitionOpportunities: number
    readonly concernedCapitalLabel: string | null
    readonly potentialMarginLabel: string | null
  }
  readonly emptyState: {
    readonly title: string
    readonly description: string
  } | null
  readonly intelligenceHref: "/intelligence"
}
