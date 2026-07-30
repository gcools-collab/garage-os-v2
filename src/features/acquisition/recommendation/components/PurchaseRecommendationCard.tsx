import { AlertTriangle, CheckCircle2, CircleHelp, Gauge } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PurchaseRecommendationViewModel } from "../presentation"

export function PurchaseRecommendationCard({
  recommendation,
}: {
  readonly recommendation: PurchaseRecommendationViewModel
}) {
  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><CardTitle>{recommendation.title}</CardTitle><CardDescription className="mt-1 max-w-3xl">{recommendation.description}</CardDescription></div>
        <div className="flex gap-2"><Badge variant="outline">Confiance {recommendation.confidenceLabel}</Badge><Badge variant={recommendation.riskTone === "danger" ? "destructive" : "secondary"}>Risque {recommendation.riskLabel}</Badge></div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Estimation de revente" value={recommendation.resaleRange} />
        <Metric label="Prix conseillé" value={recommendation.recommendedPrice} emphasis />
        <Metric label="Prix maximum" value={recommendation.maximumPrice} />
        <Metric label="Score global" value={recommendation.scoreLabel} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Estimation médiane" value={recommendation.resaleMedian} />
        <Metric label="Frais estimés" value={recommendation.estimatedCosts} />
        <Metric label="Marge brute estimée" value={recommendation.estimatedGrossMargin} />
        <Metric label="Marge nette estimée" value={recommendation.estimatedNetMargin} />
      </div>
      <div>
        <h3 className="flex items-center gap-2 font-semibold"><Gauge className="size-4" />Détail des scores</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{recommendation.scores.map((score) => <div key={score.label} className="rounded-lg border p-3"><div className="flex justify-between gap-3"><span className="font-medium">{score.label}</span><span>{score.value}</span></div><p className="mt-1 text-xs text-muted-foreground">{score.explanation}</p></div>)}</div>
      </div>
      <div>
        <h3 className="flex items-center gap-2 font-semibold"><CircleHelp className="size-4" />Pourquoi ?</h3>
        <div className="mt-3 grid gap-2">{recommendation.factors.map((factor) => <div key={factor.label} className="flex gap-3 rounded-lg bg-muted/50 p-3"><span className="w-8 shrink-0 text-sm font-semibold">{factor.impactLabel}</span><div><p className="text-sm font-medium">{factor.label}</p><p className="text-xs text-muted-foreground">{factor.explanation}</p></div></div>)}</div>
      </div>
      {recommendation.recommendations.length ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"><h3 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />À fiabiliser</h3><ul className="mt-2 space-y-1 text-sm">{recommendation.recommendations.map((item) => <li key={item}>• {item}</li>)}</ul></div> : <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" />Les informations essentielles sont disponibles.</p>}
    </CardContent>
  </Card>
}

function Metric({ label, value, emphasis = false }: { readonly label: string; readonly value: string; readonly emphasis?: boolean }) {
  return <div className={emphasis ? "rounded-xl border bg-foreground p-4 text-background" : "rounded-xl border p-4"}><p className={emphasis ? "text-xs text-background/70" : "text-xs text-muted-foreground"}>{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>
}
