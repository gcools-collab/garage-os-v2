import { Lightbulb } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardListItemViewModel } from "../types"

export function RecommendationList({
  recommendations,
}: {
  readonly recommendations: readonly DashboardListItemViewModel[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommandations IA</CardTitle>
        <CardDescription>Des recommandations déterministes, préparées à partir des données du garage.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-4 md:grid-cols-3">
          {recommendations.map((recommendation) => (
            <li key={recommendation.id} className="rounded-xl bg-muted/60 p-4">
              <Lightbulb className="size-5 text-blue-700" aria-hidden="true" />
              <p className="mt-3 font-medium">{recommendation.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{recommendation.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
