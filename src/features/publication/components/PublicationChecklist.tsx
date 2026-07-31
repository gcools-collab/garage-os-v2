import { AlertTriangle, Ban, CheckCircle2, CircleMinus } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PublicationChecklistItemViewModel } from "../presentation"

const icons = {
  PASS: CheckCircle2,
  WARNING: AlertTriangle,
  BLOCKER: Ban,
  NOT_APPLICABLE: CircleMinus,
} as const

function ChecklistItems({ items }: { readonly items: readonly PublicationChecklistItemViewModel[] }) {
  return (
    <ul className="divide-y" aria-label="Contrôles de publication">
      {items.map((item) => {
        const Icon = icons[item.state]
        return (
          <li key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
            <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.title}</p>
                <Badge variant={item.state === "BLOCKER" ? "destructive" : "secondary"}>
                  {item.stateLabel}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
            {item.href && item.actionLabel ? (
              <Button asChild variant="outline" size="sm">
                <Link href={item.href}>{item.actionLabel}</Link>
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export function PublicationChecklist({
  items,
}: {
  readonly items: readonly PublicationChecklistItemViewModel[]
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Checklist de publication</CardTitle>
        <CardDescription>Chaque contrôle indique précisément ce qui est prêt et ce qui reste à compléter.</CardDescription>
      </CardHeader>
      <CardContent><ChecklistItems items={items} /></CardContent>
    </Card>
  )
}

export function PublicationIssueCard({
  title,
  description,
  items,
}: {
  readonly title: string
  readonly description: string
  readonly items: readonly PublicationChecklistItemViewModel[]
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0
          ? <ChecklistItems items={items} />
          : <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Aucun élément.</p>}
      </CardContent>
    </Card>
  )
}
