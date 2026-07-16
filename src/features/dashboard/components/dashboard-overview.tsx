import type { DashboardData } from "../types/dashboard"
import { ComingSoon } from "./coming-soon"
import { ImportStats } from "./import-stats"
import { PriorityActions } from "./priority-actions"
import { RecentVehicles } from "./recent-vehicles"
import { StockCompleteness } from "./stock-completeness"
import { SummaryCards } from "./summary-cards"

export function DashboardOverview({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-muted-foreground">{data.garageName}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="mt-2 text-muted-foreground">
          L&apos;essentiel de votre activité, les actions à mener maintenant.
        </p>
      </header>

      <SummaryCards summary={data.summary} />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <PriorityActions priorities={data.priorities} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
          <ImportStats imports={data.imports} />
          <StockCompleteness percentage={data.averageCompleteness} />
        </div>
      </section>

      <RecentVehicles vehicles={data.recentVehicles} />
      <ComingSoon />
    </div>
  )
}
