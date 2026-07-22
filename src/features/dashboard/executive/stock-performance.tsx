import { Car, Clock3, Landmark, TrendingUp } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionHeading } from "./executive-summary"
import type { StockPerformanceVehicle } from "./types"

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })

export function StockPerformance({ performance }: { performance: { bestMargins: StockPerformanceVehicle[]; highestCapital: StockPerformanceVehicle[]; oldestStock: StockPerformanceVehicle[] } }) {
  return <section aria-labelledby="performance-title" className="space-y-4">
    <SectionHeading id="performance-title" title="Performance du stock" description="Les véhicules qui concentrent la marge, le capital et le temps d’immobilisation." />
    <div className="grid gap-6 xl:grid-cols-3">
      <PerformanceList title="Meilleures marges potentielles" icon={TrendingUp} vehicles={performance.bestMargins} primary={(v) => formatMoney(v.potentialMargin)} />
      <PerformanceList title="Capital immobilisé le plus élevé" icon={Landmark} vehicles={performance.highestCapital} primary={(v) => money.format(v.investedCapital)} />
      <PerformanceList title="Plus anciens en stock" icon={Clock3} vehicles={performance.oldestStock} primary={(v) => `${v.ageDays} jour${v.ageDays > 1 ? "s" : ""}`} />
    </div>
  </section>
}

function PerformanceList({ title, icon: Icon, vehicles, primary }: { title: string; icon: typeof TrendingUp; vehicles: StockPerformanceVehicle[]; primary: (vehicle: StockPerformanceVehicle) => string }) {
  return <Card className="h-full"><CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4 text-muted-foreground" />{title}</CardTitle></CardHeader><CardContent>
    {vehicles.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Aucun véhicule à afficher.</p> : <ol className="divide-y">{vehicles.map((vehicle) => <li key={vehicle.id}><Link href={`/stock/${vehicle.id}`} className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      {vehicle.primaryImageUrl ? <div role="img" aria-label={vehicle.name} className="size-12 shrink-0 rounded-lg bg-muted bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(vehicle.primaryImageUrl)})` }} /> : <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted"><Car className="size-5 text-muted-foreground" /></div>}
      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate font-medium group-hover:text-primary">{vehicle.name}</p><span className="shrink-0 font-semibold tabular-nums">{primary(vehicle)}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">Prix {formatMoney(vehicle.sellingPrice)} · Marge {formatMoney(vehicle.potentialMargin)} · {vehicle.ageDays} j en stock</p></div>
    </Link></li>)}</ol>}
  </CardContent></Card>
}

function formatMoney(value: number | null) { return value === null ? "Non renseigné" : money.format(value) }
