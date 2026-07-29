import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MarketDashboardViewModel } from "../../presentation"
import { MarketStatusBadge, toneClasses } from "./MarketStatusBadge"
import { MarketVehicleDetails } from "./MarketVehicleDetails"

export function MarketDashboardPage({ dashboard }: { dashboard: MarketDashboardViewModel }) {
  return (
    <main className="space-y-8">
      <header><h1 className="text-3xl font-bold tracking-tight">{dashboard.header.title}</h1><p className="mt-2 text-muted-foreground">{dashboard.header.description}</p><p className="mt-2 text-sm font-medium">{dashboard.header.helper}</p></header>
      {dashboard.emptyState ? <Card><CardHeader><CardTitle>{dashboard.emptyState.title}</CardTitle><CardDescription>{dashboard.emptyState.description}</CardDescription></CardHeader></Card> : <>
        <section aria-labelledby="market-summary"><h2 id="market-summary" className="sr-only">Résumé marché</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{dashboard.summary.map((item) => <Card key={item.id}><CardHeader><CardDescription>{item.label}</CardDescription><CardTitle className={`text-2xl ${toneClasses[item.tone]}`}>{item.value}</CardTitle></CardHeader></Card>)}</div></section>
        <section aria-labelledby="market-priorities"><h2 id="market-priorities" className="text-xl font-semibold">Actions prioritaires</h2><div className="mt-4 grid gap-4 lg:grid-cols-2">{dashboard.priorityActions.map((action) => <Card key={action.vehicleId}><CardHeader><CardTitle>{action.vehicleLabel}</CardTitle><CardDescription>{action.title}</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">{action.description}</p><Link href={action.href} className="mt-4 inline-flex font-medium underline underline-offset-4">{action.actionLabel}</Link></CardContent></Card>)}</div></section>
        <section aria-labelledby="market-vehicles"><h2 id="market-vehicles" className="text-xl font-semibold">Analyse des véhicules</h2><div className="mt-4 space-y-4">{dashboard.vehicles.map((insight) => <Card key={insight.vehicleId}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{insight.vehicleLabel}</CardTitle><CardDescription>{insight.currentPrice} · {insight.comparableCount} comparable{insight.comparableCount > 1 ? "s" : ""}</CardDescription></div><div className="flex flex-wrap gap-2"><MarketStatusBadge status={insight.position} /><MarketStatusBadge status={insight.confidence} /></div></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Prix marché" value={insight.marketPrice ?? "Non disponible"} /><Metric label="Écart" value={[insight.priceGap, insight.priceGapPercent].filter(Boolean).join(" · ") || "Non disponible"} /><Metric label="Prix recommandé" value={insight.recommendedPrice ?? "Non disponible"} /><Metric label="Score" value={insight.competitiveness.value == null ? insight.competitiveness.label : `${insight.competitiveness.value}/100 — ${insight.competitiveness.label}`} /><Metric label="Santé" value={insight.marketHealth.label} /></div>{insight.recommendationNote && <p className="text-sm text-muted-foreground">{insight.recommendationNote}</p>}<MarketVehicleDetails insight={insight} /></CardContent></Card>)}</div></section>
      </>}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>
}
