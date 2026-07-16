import { Car, CircleDollarSign, TrendingUp, WalletCards } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardSummary } from "../types/dashboard"

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const cards = [
    { label: "Véhicules en stock", value: String(summary.vehicleCount), icon: Car },
    {
      label: "Valeur affichée",
      value: currency.format(summary.displayedValue),
      icon: CircleDollarSign,
    },
    {
      label: "Coût d'achat",
      value: currency.format(summary.purchaseCost),
      icon: WalletCards,
    },
    {
      label: "Marge potentielle",
      value: currency.format(summary.potentialMargin),
      icon: TrendingUp,
    },
  ]

  return (
    <section aria-labelledby="stock-summary-title">
      <h2 id="stock-summary-title" className="sr-only">Résumé du stock</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
