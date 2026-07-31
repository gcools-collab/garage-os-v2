import { AlertTriangle, CheckCircle2, CircleGauge } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PublicationWorkspaceViewModel } from "../presentation"

const progressColor = {
  RED: "bg-red-600",
  ORANGE: "bg-orange-500",
  GREEN: "bg-emerald-600",
} as const

export function PublicationSummary({
  workspace,
}: {
  readonly workspace: PublicationWorkspaceViewModel
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Résumé</CardTitle>
            <CardDescription>{workspace.workflow.description}</CardDescription>
          </div>
          <Badge variant="secondary">{workspace.workflow.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex size-28 flex-col items-center justify-center rounded-full border-8 border-muted">
          <span className="text-2xl font-semibold tabular-nums">{workspace.readiness.score}%</span>
          <span className="text-xs text-muted-foreground">Préparation</span>
        </div>
        <div className="space-y-3">
          <div
            role="progressbar"
            aria-label="Préparation à la publication"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={workspace.readiness.score}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full ${progressColor[workspace.readiness.color]}`}
              style={{ width: `${workspace.readiness.score}%` }}
            />
          </div>
          <p className="font-medium">{workspace.readiness.summary}</p>
          <p className="text-sm text-muted-foreground">{workspace.readiness.progressLabel}</p>
          <p className="sr-only" aria-live="polite">{workspace.readiness.statusAnnouncement}</p>
          <div className="flex items-center gap-2 text-sm">
            {workspace.readiness.canPublish
              ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              : <AlertTriangle className="size-4 text-red-600" aria-hidden="true" />}
            <CircleGauge className="size-4 text-muted-foreground" aria-hidden="true" />
            <span>{workspace.readiness.canPublish ? "Décision de publication disponible" : "Publication bloquée"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
