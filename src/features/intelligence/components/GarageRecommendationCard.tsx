import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  dismissRecommendation,
  markRecommendationCompleted,
  snoozeRecommendation,
} from "../actions"
import type { GarageRecommendationViewModel } from "../types"

export function GarageRecommendationCard({
  recommendation,
}: {
  readonly recommendation: GarageRecommendationViewModel
}) {
  return (
    <article aria-labelledby={`recommendation-${recommendation.rank}`}>
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Priorité {recommendation.rank}</Badge>
          <Badge variant="outline">{recommendation.categoryLabel}</Badge>
          <Badge variant="outline">{recommendation.statusLabel}</Badge>
        </div>
        <CardTitle id={`recommendation-${recommendation.rank}`} className="text-lg">
          {recommendation.action}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">{recommendation.subject}</p>
          <p className="mt-1 text-muted-foreground">{recommendation.primaryReason}</p>
          {recommendation.secondaryReasons.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {recommendation.secondaryReasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          ) : null}
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">Impact</dt><dd className="font-medium">{recommendation.impactLabel}</dd></div>
          <div><dt className="text-muted-foreground">Urgence</dt><dd className="font-medium">{recommendation.urgencyLabel}</dd></div>
          <div><dt className="text-muted-foreground">Effort</dt><dd className="font-medium">{recommendation.effortLabel}</dd></div>
          <div><dt className="text-muted-foreground">Confiance</dt><dd className="font-medium">{recommendation.confidenceLabel}</dd></div>
        </dl>
        {recommendation.evidence.length ? (
          <div>
            <p className="text-sm font-medium">Éléments observés</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {recommendation.evidence.map((proof) => <li key={proof}>{proof}</li>)}
            </ul>
          </div>
        ) : null}
        {recommendation.snoozedUntilLabel ? <p className="text-sm text-muted-foreground">Reportée jusqu’au {recommendation.snoozedUntilLabel}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href={recommendation.href}>{recommendation.ctaLabel}</Link></Button>
          <Button asChild variant="outline">
            <Link href={`/copilot?recommendation=${encodeURIComponent(recommendation.id)}`}>
              Demander au Copilote
            </Link>
          </Button>
          <form action={markRecommendationCompleted}>
            <input type="hidden" name="recommendationKey" value={recommendation.id} />
            <Button type="submit" variant="outline">Marquer comme traité</Button>
          </form>
          <form action={snoozeRecommendation} className="flex gap-2">
            <input type="hidden" name="recommendationKey" value={recommendation.id} />
            <input name="snoozedUntil" type="datetime-local" required aria-label="Reporter jusqu’au" className="min-h-9 rounded-md border bg-background px-2 text-sm" />
            <Button type="submit" variant="outline">Reporter</Button>
          </form>
          <form action={dismissRecommendation}>
            <input type="hidden" name="recommendationKey" value={recommendation.id} />
            <Button type="submit" variant="ghost">Ignorer</Button>
          </form>
        </div>
      </CardContent>
    </Card>
    </article>
  )
}
