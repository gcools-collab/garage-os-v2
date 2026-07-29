import { Sparkles } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { DashboardSummaryViewModel } from "../types"

const indicatorTone = {
  neutral: "bg-muted text-foreground",
  positive: "bg-emerald-50 text-emerald-800",
  warning: "bg-orange-50 text-orange-800",
  danger: "bg-red-50 text-red-800",
  info: "bg-blue-50 text-blue-800",
} as const

export function DashboardHeader({ summary }: { readonly summary: DashboardSummaryViewModel }) {
  return (
    <Card className="overflow-hidden bg-linear-to-br from-card via-card to-primary/5">
      <CardContent className="grid gap-8 py-2 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
            <span>{summary.eyebrow}</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{summary.title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{summary.description}</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          {summary.indicators.map((indicator) => (
            <div key={indicator.id} className={`min-w-32 rounded-xl px-4 py-3 ${indicatorTone[indicator.tone]}`}>
              <dd className="text-2xl font-semibold tabular-nums">{indicator.value}</dd>
              <dt className="mt-1 text-xs font-medium">{indicator.label}</dt>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
