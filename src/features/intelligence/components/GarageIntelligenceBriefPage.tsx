import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import type { GarageDailyBriefViewModel } from "../types"
import { GarageRecommendationCard } from "./GarageRecommendationCard"

const categoryFilters = [
  ["", "Toutes"], ["COMMERCIAL", "Commercial"], ["STOCK", "Stock"],
  ["PRICING", "Prix"], ["PUBLICATION", "Publication"], ["ACQUISITION", "Acquisition"],
] as const
const statusFilters = [
  ["ACTIVE", "Actives"], ["SNOOZED", "Reportées"], ["COMPLETED", "Terminées"],
  ["DISMISSED", "Ignorées"], ["RESOLVED", "Résolues"],
] as const

export function GarageIntelligenceBriefPage({
  brief,
}: {
  readonly brief: GarageDailyBriefViewModel
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Votre brief Garage OS</h1>
        <p className="mt-2 text-muted-foreground">Les actions ayant le plus d’impact pour votre garage aujourd’hui.</p>
      </header>
      <section aria-label="Indicateurs du brief" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Actions actives", brief.metrics.activeActions],
          ["Actions urgentes", brief.metrics.urgentActions],
          ["Prospects non contactés", brief.metrics.uncontactedLeads],
          ["Tâches en retard", brief.metrics.overdueTasks],
        ].map(([label, value]) => (
          <Card key={label}><CardContent><p className="text-2xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>
        ))}
      </section>
      <nav aria-label="Filtres du brief" className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {categoryFilters.map(([value, label]) => <Link key={label} href={value ? `/intelligence?category=${value}&status=ACTIVE` : "/intelligence?status=ACTIVE"} className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label}</Link>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(([value, label]) => <Link key={value} href={`/intelligence?status=${value}`} className="rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label}</Link>)}
        </div>
      </nav>
      <section aria-labelledby="priorities-title" className="space-y-4">
        <h2 id="priorities-title" className="text-xl font-semibold">Priorités du jour</h2>
        {brief.recommendations.length
          ? brief.recommendations.map((item) => <GarageRecommendationCard key={item.id} recommendation={item} />)
          : <Card><CardContent className="py-10 text-center"><p className="font-semibold">{brief.emptyState?.title}</p><p className="mt-1 text-muted-foreground">{brief.emptyState?.description}</p></CardContent></Card>}
      </section>
    </div>
  )
}
