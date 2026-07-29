import { buildGarageDashboard, GarageIntelligenceDashboard } from "@/features/intelligence"

export default function DashboardPage() {
  const dashboard = buildGarageDashboard()

  return <GarageIntelligenceDashboard dashboard={dashboard} />
}
