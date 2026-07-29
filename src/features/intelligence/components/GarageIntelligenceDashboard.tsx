import type { GarageDashboardViewModel } from "../types"
import { AlertList } from "./AlertList"
import { DashboardHeader } from "./DashboardHeader"
import { KpiGrid } from "./KpiGrid"
import { PriorityList } from "./PriorityList"
import { RecommendationList } from "./RecommendationList"
import { TimelineSection } from "./TimelineSection"

export function GarageIntelligenceDashboard({
  dashboard,
}: {
  readonly dashboard: GarageDashboardViewModel
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-8">
      <DashboardHeader summary={dashboard.summary} />

      <section aria-labelledby="business-title" className="space-y-4">
        <div>
          <h2 id="business-title" className="text-xl font-semibold tracking-tight">{dashboard.business.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{dashboard.business.description}</p>
        </div>
        <KpiGrid kpis={dashboard.kpis} />
      </section>

      <section aria-label="Pilotage quotidien" className="grid items-start gap-6 xl:grid-cols-2">
        <PriorityList priorities={dashboard.priorities} />
        <AlertList alerts={dashboard.alerts} />
      </section>

      <RecommendationList recommendations={dashboard.recommendations} />
      <TimelineSection timeline={dashboard.timeline} />
    </div>
  )
}
