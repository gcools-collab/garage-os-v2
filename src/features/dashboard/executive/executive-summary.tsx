import { Banknote, CarFront, Landmark, TrendingUp, WalletCards } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { ExecutiveFinancialMetrics } from "./types"

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
const integer = new Intl.NumberFormat("fr-FR")

export function ExecutiveSummary({ metrics }: { metrics: ExecutiveFinancialMetrics }) {
  const items = [
    { label: "Valeur totale du stock", value: money.format(metrics.stockValue), secondary: `${integer.format(metrics.vehicleCount)} véhicule${metrics.vehicleCount > 1 ? "s" : ""} actif${metrics.vehicleCount > 1 ? "s" : ""}`, icon: Banknote, featured: true },
    { label: "Capital immobilisé", value: money.format(metrics.investedCapital), secondary: metrics.investedCapitalShare === null ? null : `${metrics.investedCapitalShare.toFixed(1)} % de la valeur du stock`, icon: Landmark },
    { label: "Marge potentielle totale", value: money.format(metrics.potentialMargin), secondary: metrics.potentialMarginRate === null ? null : `${metrics.potentialMarginRate.toFixed(1)} % de la valeur du stock`, icon: TrendingUp, valueTone: metrics.potentialMargin < 0 ? "danger" : metrics.potentialMargin > 0 ? "positive" : undefined },
    { label: "Marge moyenne par véhicule", value: money.format(metrics.averageMargin), secondary: "par véhicule", icon: WalletCards, valueTone: metrics.averageMargin < 0 ? "danger" : metrics.averageMargin > 0 ? "positive" : undefined },
    { label: "Véhicules en stock", value: integer.format(metrics.vehicleCount), secondary: "véhicules actifs", icon: CarFront },
  ]

  return <section aria-labelledby="financial-title" className="space-y-4">
    <SectionHeading id="financial-title" title="Santé financière" description="La valeur du parc et le capital actuellement engagé." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map(({ label, value, secondary, icon: Icon, featured, valueTone }) => <Card key={label} className={featured ? "ring-primary/25" : undefined}>
        <CardContent>
          <div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-xs font-medium uppercase tracking-wide">{label}</span><Icon className="size-4" /></div>
          <p className={valueTone === "danger" ? "mt-4 text-2xl font-semibold tracking-tight tabular-nums text-red-700" : valueTone === "positive" ? "mt-4 text-2xl font-semibold tracking-tight tabular-nums text-emerald-700" : "mt-4 text-2xl font-semibold tracking-tight tabular-nums"}>{value}</p>
          {secondary && <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>}
        </CardContent>
      </Card>)}
    </div>
  </section>
}

export function SectionHeading({ id, title, description }: { id?: string; title: string; description: string }) {
  return <div><h2 id={id} className="text-xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
}
