export type ExecutiveFinancialMetrics = {
  stockValue: number
  investedCapital: number
  potentialMargin: number
  averageMargin: number
  vehicleCount: number
  investedCapitalShare: number | null
  potentialMarginRate: number | null
}

export type ExecutiveActivity = {
  preparation: number
  published: number
  reserved: number
  sold: number
  publishedOver30Days: number
  publishedOver60Days: number
  publishedOver90Days: number
}

export type ExecutivePriority = {
  id: string
  count: number
  label: string
  href: string
  tone: "warning" | "danger"
}

export type StockPerformanceVehicle = {
  id: string
  name: string
  primaryImageUrl: string | null
  sellingPrice: number | null
  potentialMargin: number | null
  investedCapital: number
  ageDays: number
}

export type ExecutivePriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type WatchedVehicle = StockPerformanceVehicle & {
  status: import("@/features/vehicles/status/vehicle-status").VehicleStatus
  priorityScore: number
  priorityLevel: ExecutivePriorityLevel
  reasons: string[]
  summary: string
  detail: string
}

export type ExecutiveTodaySummary = {
  garageName: string | null
  actionCount: number
  missingAnalysisCount: number
  incompleteVehicleCount: number
  criticalVehicleCount: number
  potentialMargin: number
}

export type ExecutiveDashboardData = {
  garageName: string
  financial: ExecutiveFinancialMetrics
  today: ExecutiveTodaySummary
  activity: ExecutiveActivity
  priorities: ExecutivePriority[]
  watchedVehicles: WatchedVehicle[]
}
