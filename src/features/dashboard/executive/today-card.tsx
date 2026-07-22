import { AlertCircle, ChartNoAxesCombined, CircleCheck, Flame, ListTodo } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { ExecutiveTodaySummary } from "./types"

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })

export function TodayCard({ summary }: { summary: ExecutiveTodaySummary }) {
  const title = summary.garageName ? `Aujourd’hui chez ${summary.garageName}` : "Aujourd’hui"
  return <Card className="bg-gradient-to-br from-card via-card to-muted/40 ring-primary/20">
    <CardContent className="py-2 sm:py-4">
      <div className="flex items-start gap-4"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Flame className="size-6" /></div><div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {summary.actionCount === 0 ? <div className="mt-5 flex items-center gap-2 text-emerald-700"><CircleCheck className="size-5" /><p className="font-medium">Tout est à jour aujourd’hui.</p></div> : <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
          <SummaryItem icon={ListTodo} value={`${summary.actionCount} action${summary.actionCount > 1 ? "s" : ""} prioritaire${summary.actionCount > 1 ? "s" : ""}`} tone="warning" />
          <SummaryItem icon={ChartNoAxesCombined} value={`${summary.missingAnalysisCount} analyse${summary.missingAnalysisCount > 1 ? "s" : ""} marché à lancer`} tone={summary.missingAnalysisCount > 0 ? "warning" : undefined} />
          <SummaryItem icon={AlertCircle} value={`${summary.incompleteVehicleCount} véhicule${summary.incompleteVehicleCount > 1 ? "s" : ""} incomplet${summary.incompleteVehicleCount > 1 ? "s" : ""}`} tone={summary.incompleteVehicleCount > 0 ? "warning" : undefined} />
          <SummaryItem icon={AlertCircle} value={summary.criticalVehicleCount === 0 ? "Aucun véhicule critique" : `${summary.criticalVehicleCount} véhicule${summary.criticalVehicleCount > 1 ? "s" : ""} critique${summary.criticalVehicleCount > 1 ? "s" : ""}`} tone={summary.criticalVehicleCount > 0 ? "danger" : "positive"} />
          <SummaryItem icon={ChartNoAxesCombined} value={`Marge potentielle : ${money.format(summary.potentialMargin)}`} tone={summary.potentialMargin < 0 ? "danger" : summary.potentialMargin > 0 ? "positive" : undefined} />
        </div>}
      </div></div>
    </CardContent>
  </Card>
}

function SummaryItem({ icon: Icon, value, tone }: { icon: typeof ListTodo; value: string; tone?: "positive" | "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-orange-700" : tone === "positive" ? "text-emerald-700" : "text-foreground"
  return <div className={`flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2.5 ${color}`}><Icon className="size-4 shrink-0" /><span className="font-medium">{value}</span></div>
}
