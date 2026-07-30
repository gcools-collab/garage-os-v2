import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AcquisitionMarketAiInsightViewModel } from "../presentation"

export function AcquisitionMarketAiCard({
  insight,
}: {
  readonly insight: AcquisitionMarketAiInsightViewModel
}) {
  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><CardTitle>{insight.title}</CardTitle><CardDescription>{insight.description}</CardDescription></div>
        <div className="flex gap-2"><Badge variant="outline">Insight IA</Badge>{insight.confidenceLabel ? <Badge variant="secondary">Confiance {insight.confidenceLabel}</Badge> : null}</div>
      </div>
    </CardHeader>
    <CardContent className="space-y-5">
      {insight.available ? <>
        <p className="text-sm">{insight.summary}</p>
        <InsightList title="Points favorables" items={insight.positiveSignals} />
        <InsightList title="Risques détectés" items={insight.riskSignals} />
        <InsightList title="Faits extraits" items={insight.extractedFacts} />
        <InsightList title="Contrôles à effectuer" items={insight.recommendedChecks} />
        <InsightList title="Arguments de négociation" items={insight.negotiationArguments} />
        <InsightList title="Limites" items={insight.limitations} />
      </> : <p className="text-sm text-muted-foreground">Les calculs déterministes restent disponibles sans cet enrichissement.</p>}
    </CardContent>
  </Card>
}

function InsightList({ title, items }: { readonly title: string; readonly items: readonly string[] }) {
  if (!items.length) return null
  return <section><h3 className="text-sm font-semibold">{title}</h3><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{items.map((item) => <li key={item}>• {item}</li>)}</ul></section>
}
