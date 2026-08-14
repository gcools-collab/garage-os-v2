import type { LeadPriority, LeadStatus, LeadType } from "./lead"

export type LeadListItemViewModel = {
  readonly id: string
  readonly status: LeadStatus
  readonly statusLabel: string
  readonly type: LeadType
  readonly typeLabel: string
  readonly createdAtLabel: string
  readonly customerName: string
  readonly contactLabel: string
  readonly vehicleTitle: string
  readonly preferredSlotLabel: string | null
  readonly priority: LeadPriority
  readonly priorityLabel: string
  readonly href: string
}

export type LeadDetailViewModel = LeadListItemViewModel & {
  readonly phone: string | null
  readonly phoneHref: string | null
  readonly email: string | null
  readonly emailHref: string | null
  readonly message: string | null
  readonly sourceLabel: string
  readonly consentContactLabel: string
  readonly consentMarketingLabel: string
  readonly stockHref: string | null
  readonly publicHref: string | null
  readonly priceLabel: string | null
  readonly requestDetails: readonly { readonly label: string; readonly value: string }[]
  readonly availableStatuses: readonly {
    readonly value: LeadStatus
    readonly label: string
  }[]
  readonly events: readonly {
    readonly id: string
    readonly label: string
    readonly dateLabel: string
  }[]
}

export type LeadDashboardSummaryViewModel = {
  readonly newCount: number
  readonly toContactCount: number
  readonly appointmentRequestCount: number
  readonly overdueCount: number
  readonly newTodayCount: number
  readonly testDriveCount: number
  readonly tradeInCount: number
  readonly serviceRequestCount: number
  readonly message: string | null
}
