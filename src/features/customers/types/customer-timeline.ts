export const TIMELINE_CATEGORIES = [
  "ALL",
  "CUSTOMER",
  "COMMERCIAL",
  "APPOINTMENT",
  "PAYMENT",
  "BILLING",
  "REGISTRATION",
  "VEHICLE",
] as const

export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number]

export type CustomerTimelineEvent = {
  readonly id: string
  readonly category: TimelineCategory
  readonly typeLabel: string
  readonly occurredAt: string
  readonly description: string
  readonly domainLabel: string
  readonly amountLabel: string | null
  readonly statusLabel: string | null
  readonly href: string | null
  readonly isImported: boolean
  readonly sortKey: string
}

export type CustomerSummaryMetrics = {
  readonly appointmentCount: number
  readonly completedAppointmentCount: number
  readonly upcomingAppointmentCount: number
  readonly leadCount: number
  readonly registrationCaseCount: number
  readonly vehicleCount: number
  readonly historicalPaidCents: number
  readonly livePaidCents: number
  readonly invoicedCents: number
  readonly outstandingCents: number
  readonly firstInteractionAt: string | null
  readonly lastInteractionAt: string | null
  readonly nextAppointmentAt: string | null
}
