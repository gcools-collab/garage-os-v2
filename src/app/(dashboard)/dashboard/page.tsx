import { redirect } from "next/navigation"

import {
  ActivitySummary,
  ExecutiveDashboardService,
  ExecutivePriorityActions,
  ExecutiveSummary,
  TodayCard,
  VehiclesToWatch,
} from "@/features/dashboard/executive"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const dashboard = await new ExecutiveDashboardService(
    await createClient()
  ).getDashboard()

  if (!dashboard) redirect("/register")

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-6">
      <TodayCard summary={dashboard.today} />

      <header>
        <p className="text-sm font-medium text-muted-foreground">{dashboard.garageName}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Tableau de bord dirigeant</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pilotez la valeur du parc, le capital engagé et les actions du jour.
        </p>
      </header>

      <ExecutiveSummary metrics={dashboard.financial} />
      <ActivitySummary activity={dashboard.activity} />
      <ExecutivePriorityActions priorities={dashboard.priorities} />
      <VehiclesToWatch vehicles={dashboard.watchedVehicles} />
    </div>
  )
}
