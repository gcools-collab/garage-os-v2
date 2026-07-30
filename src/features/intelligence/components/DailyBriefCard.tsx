import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { GarageDailyBriefViewModel } from "../types"

export function DailyBriefCard({ brief }: { readonly brief: GarageDailyBriefViewModel }) {
  const top = brief.topRecommendations[0]
  return (
    <Card className="bg-card shadow-sm ring-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles aria-hidden="true" /> Brief du jour</div>
        <CardTitle className="text-2xl">{brief.greeting}</CardTitle>
        <p className="text-sm text-muted-foreground">{brief.generatedAtLabel}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div><p className="text-xl font-semibold">{brief.headline}</p><p className="mt-1 text-muted-foreground">{brief.summary}</p></div>
        {top ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priorité numéro 1</p>
            <p className="mt-1 font-semibold">{top.action}</p>
            <p className="mt-1 text-sm text-muted-foreground">{top.primaryReason}</p>
          </div>
        ) : null}
        {brief.categorySummaries.length ? (
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {brief.categorySummaries.map((item) => <li key={item.category}>{item.count} · {item.label}</li>)}
          </ul>
        ) : null}
        <Button asChild><Link href={brief.intelligenceHref}>Voir toutes les priorités <ArrowRight aria-hidden="true" /></Link></Button>
      </CardContent>
    </Card>
  )
}
