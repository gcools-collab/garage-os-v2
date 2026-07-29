export type DashboardTone = "neutral" | "positive" | "warning" | "danger" | "info"

export type DashboardSummaryViewModel = {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly indicators: readonly {
    readonly id: string
    readonly value: string
    readonly label: string
    readonly tone: DashboardTone
  }[]
}

export type DashboardBusinessViewModel = {
  readonly title: string
  readonly description: string
}

export type DashboardKpiViewModel = {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly tone: DashboardTone
}

export type DashboardListItemViewModel = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly tone: DashboardTone
}

export type DashboardTimelineItemViewModel = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly dateLabel: string
  readonly tone: DashboardTone
}

export type GarageDashboardViewModel = {
  readonly summary: DashboardSummaryViewModel
  readonly business: DashboardBusinessViewModel
  readonly priorities: readonly DashboardListItemViewModel[]
  readonly alerts: readonly DashboardListItemViewModel[]
  readonly recommendations: readonly DashboardListItemViewModel[]
  readonly timeline: readonly DashboardTimelineItemViewModel[]
  readonly kpis: readonly DashboardKpiViewModel[]
}
