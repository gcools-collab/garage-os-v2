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
import { CopilotDashboardCard } from "@/features/copilot"
import { AppointmentDashboardSignal, buildAppointmentDashboardSummary, getAppointments } from "@/features/scheduling"

export default async function DashboardPage() {
  const session = await getActiveGarageSession()
  if (!session) redirect("/auth/recover")
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/dashboard") redirect(destination)
  if (!session.garageName) redirect("/select-garage")
  if (!session.garageId) redirect("/select-garage")
  const garageId = session.garageId

  const dashboard = buildGarageDashboard({
    context: { garageName: session.garageName },
  })
  const [leadCounts, commercialData, intelligenceBrief, appointments] = await Promise.all([
    getLeadDashboardCounts(session),
    getCommercialInboxData(session),
    refreshGarageRecommendations(session),
    getAppointments(garageId),
  ])
  const leadSummary = buildLeadDashboardSummary(leadCounts)
  const commercialSignal = buildCommercialDashboardSignal(commercialData)

  const dailyBrief = buildGarageDailyBriefViewModel(intelligenceBrief, { status: "ACTIVE" })

  return <div className="space-y-6"><DailyBriefCard brief={dailyBrief} /><AppointmentDashboardSignal summary={buildAppointmentDashboardSummary(appointments)} /><CopilotDashboardCard /><CommercialDashboardSignal signal={commercialSignal} /><LeadDashboardSignal summary={leadSummary} /><GarageIntelligenceDashboard dashboard={dashboard} /></div>
}
