import { redirect } from "next/navigation"

import { DailyCockpit, buildDailyCockpitKpis } from "@/features/dashboard"
import {
  buildGarageDailyBriefViewModel,
  buildGarageDashboardFromBrief,
  refreshGarageRecommendations,
} from "@/features/intelligence"
import {
  buildLeadDashboardSummary,
  getLeadDashboardCounts,
} from "@/features/leads"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"
import { buildAppointmentDashboardSummary, getAppointments } from "@/features/scheduling"

export default async function DashboardPage() {
  const session = await getActiveGarageSession()
  if (!session) redirect("/auth/recover")
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/dashboard") redirect(destination)
  if (!session.garageName) redirect("/select-garage")
  if (!session.garageId) redirect("/select-garage")
  const garageId = session.garageId
  const firstName = session.userDisplayName?.split(/\s+/)[0] ?? ""

  const [leadCounts, intelligenceBrief, appointments] = await Promise.all([
    getLeadDashboardCounts(session),
    refreshGarageRecommendations(session),
    getAppointments(garageId),
  ])
  const dashboard = buildGarageDashboardFromBrief(intelligenceBrief, {
    garageName: session.garageName,
    userFirstName: firstName,
  })
  const leadSummary = buildLeadDashboardSummary(leadCounts)
  const dailyBrief = buildGarageDailyBriefViewModel(intelligenceBrief, { status: "ACTIVE" })
  const appointmentSummary = buildAppointmentDashboardSummary(appointments)
  const topPriority = dailyBrief.topRecommendations[0] ?? null

  return (
    <DailyCockpit
      greeting={firstName ? `Bonjour ${firstName}` : "Bonjour"}
      garageName={session.garageName}
      headline={dailyBrief.headline}
      kpis={buildDailyCockpitKpis(dashboard.kpis, appointmentSummary, leadSummary)}
      priority={topPriority ? {
        action: topPriority.action,
        reason: topPriority.primaryReason,
        href: topPriority.href,
        ctaLabel: topPriority.ctaLabel,
      } : null}
      emptyPriority={dailyBrief.emptyState}
      appointments={appointmentSummary}
      leads={leadSummary}
      alerts={dashboard.alerts}
    />
  )
}
