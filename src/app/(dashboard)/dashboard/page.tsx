import { redirect } from "next/navigation"

import {
  buildGarageDailyBriefViewModel,
  buildGarageDashboard,
  DailyBriefCard,
  GarageIntelligenceDashboard,
  refreshGarageRecommendations,
} from "@/features/intelligence"
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
  const [leadCounts, commercialData, intelligenceBrief] = await Promise.all([
    getLeadDashboardCounts(session),
    getCommercialInboxData(session),
    refreshGarageRecommendations(session),
  ])
  const leadSummary = buildLeadDashboardSummary(leadCounts)
  const commercialSignal = buildCommercialDashboardSignal(commercialData)

  const dailyBrief = buildGarageDailyBriefViewModel(intelligenceBrief, { status: "ACTIVE" })

  return <div className="space-y-6"><DailyBriefCard brief={dailyBrief} /><CommercialDashboardSignal signal={commercialSignal} /><LeadDashboardSignal summary={leadSummary} /><GarageIntelligenceDashboard dashboard={dashboard} /></div>
}
