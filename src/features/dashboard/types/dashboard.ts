export type DashboardSummary = {
  vehicleCount: number
  displayedValue: number
  purchaseCost: number
  potentialMargin: number
}

export type DashboardPriority = {
  id: "purchasePrice" | "vin" | "registration" | "photo" | "notes"
  count: number
  label: string
  href: string
}

export type DashboardRecentVehicle = {
  id: string
  name: string
  createdAt: string
  primaryImageUrl: string | null
}

export type DashboardImports = {
  today: number
  thisWeek: number
}

export type DashboardData = {
  garageName: string
  summary: DashboardSummary
  priorities: DashboardPriority[]
  recentVehicles: DashboardRecentVehicle[]
  imports: DashboardImports
  averageCompleteness: number
}
