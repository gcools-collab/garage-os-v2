import type { GarageRecommendationType, RecommendationEffort } from "../types"

export type GarageIntelligenceConfig = {
  readonly uncontactedLeadHours: number
  readonly overdueTaskMinutes: number
  readonly appointmentConfirmationHours: number
  readonly agingVehicleDays: number
  readonly stagnatingVehicleDays: number
  readonly priceReviewDays: number
  readonly aboveMarketPercent: number
  readonly minimumComparableCount: number
  readonly minimumMarketConfidence: "HIGH" | "MEDIUM" | "LOW"
  readonly highCapitalThresholdCents: number
  readonly minimumEstimatedMarginCents: number
  readonly maximumRecommendationsPerBrief: number
  readonly effortDurations: Readonly<Record<GarageRecommendationType, {
    readonly effort: RecommendationEffort
    readonly minutes: number
  }>>
}

export const defaultGarageIntelligenceConfig: GarageIntelligenceConfig = {
  uncontactedLeadHours: 4,
  overdueTaskMinutes: 15,
  appointmentConfirmationHours: 24,
  agingVehicleDays: 45,
  stagnatingVehicleDays: 60,
  priceReviewDays: 30,
  aboveMarketPercent: 5,
  minimumComparableCount: 5,
  minimumMarketConfidence: "MEDIUM",
  highCapitalThresholdCents: 2_000_000,
  minimumEstimatedMarginCents: 150_000,
  maximumRecommendationsPerBrief: 20,
  effortDurations: {
    CONTACT_LEAD: { effort: "VERY_LOW", minutes: 3 },
    FOLLOW_UP_LEAD: { effort: "VERY_LOW", minutes: 3 },
    CONFIRM_APPOINTMENT: { effort: "VERY_LOW", minutes: 2 },
    COMPLETE_TASK: { effort: "LOW", minutes: 5 },
    REVIEW_VEHICLE_PRICE: { effort: "VERY_LOW", minutes: 2 },
    REDUCE_VEHICLE_PRICE: { effort: "VERY_LOW", minutes: 2 },
    COMPLETE_VEHICLE_LISTING: { effort: "MEDIUM", minutes: 20 },
    PUBLISH_VEHICLE: { effort: "LOW", minutes: 5 },
    REVIEW_AGING_VEHICLE: { effort: "LOW", minutes: 10 },
    REVIEW_LOW_MARGIN_VEHICLE: { effort: "LOW", minutes: 10 },
    REVIEW_ACQUISITION_OPPORTUNITY: { effort: "MEDIUM", minutes: 15 },
    VERIFY_VEHICLE_AVAILABILITY: { effort: "VERY_LOW", minutes: 3 },
  },
}
