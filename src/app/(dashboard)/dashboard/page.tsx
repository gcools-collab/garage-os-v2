import { redirect } from "next/navigation"

import { buildGarageDashboard, GarageIntelligenceDashboard } from "@/features/intelligence"
import {
  buildLeadDashboardSummary,
  getLeadDashboardCounts,
  LeadDashboardSignal,
} from "@/features/leads"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"

export default async function DashboardPage() {
  const session = await getActiveGarageSession()
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/dashboard") redirect(destination)
  if (!session) redirect("/register")
  if (!session.garageName) redirect("/select-garage")

  const dashboard = buildGarageDashboard({
    context: { garageName: session.garageName },
  })
  const leadSummary = buildLeadDashboardSummary(await getLeadDashboardCounts(session))

  return <div className="space-y-6"><LeadDashboardSignal summary={leadSummary} /><GarageIntelligenceDashboard dashboard={dashboard} /></div>
}
