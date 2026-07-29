import { Clock3 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardTimelineItemViewModel } from "../types"

export function TimelineSection({ timeline }: { readonly timeline: readonly DashboardTimelineItemViewModel[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dernières activités</CardTitle>
        <CardDescription>Les mouvements récents du garage, du stock et du marché.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-5 md:grid-cols-3">
          {timeline.map((event) => (
            <li key={event.id} className="relative border-l pl-5">
              <Clock3 className="absolute -left-2.5 top-0 size-5 bg-card text-muted-foreground" aria-hidden="true" />
              <time className="text-xs font-medium text-muted-foreground">{event.dateLabel}</time>
              <p className="mt-2 font-medium">{event.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
