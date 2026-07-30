import { redirect } from "next/navigation"

import { buildGarageDashboard, GarageIntelligenceDashboard } from "@/features/intelligence"
import {
  buildLeadDashboardSummary,
  getLeadDashboardCounts,
  LeadDashboardSignal,
} from "@/features/leads"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"
import {
  buildCommercialDashboardSignal,
  CommercialDashboardSignal,
  getCommercialInboxData,
} from "@/features/commercial"

export default async function DashboardPage() {
  const session = await getActiveGarageSession()
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/dashboard") redirect(destination)
  if (!session) redirect("/register")
  if (!session.garageName) redirect("/select-garage")

  const dashboard = buildGarageDashboard({
    context: { garageName: session.garageName },
  })
  const [leadCounts, commercialData] = await Promise.all([
    getLeadDashboardCounts(session),
    getCommercialInboxData(session),
  ])
  const leadSummary = buildLeadDashboardSummary(leadCounts)
  const commercialSignal = buildCommercialDashboardSignal(commercialData)

  return <div className="space-y-6"><CommercialDashboardSignal signal={commercialSignal} /><LeadDashboardSignal summary={leadSummary} /><GarageIntelligenceDashboard dashboard={dashboard} /></div>
}
