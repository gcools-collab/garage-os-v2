import { BarChart3 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { DashboardKpiViewModel } from "../types"

const valueTone = {
  neutral: "text-foreground",
  positive: "text-emerald-700",
  warning: "text-orange-700",
  danger: "text-red-700",
  info: "text-blue-700",
} as const

export function KpiGrid({ kpis }: { readonly kpis: readonly DashboardKpiViewModel[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <Card key={kpi.id}>
          <CardContent>
            <div className="flex items-center justify-between gap-3 text-muted-foreground">
              <p className="text-xs font-medium uppercase tracking-wide">{kpi.label}</p>
              <BarChart3 className="size-4" aria-hidden="true" />
            </div>
            <p className={`mt-4 text-2xl font-semibold tracking-tight tabular-nums ${valueTone[kpi.tone]}`}>
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
