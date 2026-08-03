import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PublicationTargetViewModel } from "../presentation"
import { TargetCapabilityList } from "./TargetCapabilityList"
import { TargetHealthIndicator } from "./TargetHealthIndicator"
import { TargetPreview } from "./TargetPreview"
import { TargetStatusBadge } from "./TargetStatusBadge"

const validationIcons = {
  PASS: CheckCircle2,
  WARNING: AlertTriangle,
  BLOCKER: XCircle,
} as const

export function TargetCard({ target }: { readonly target: PublicationTargetViewModel }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{target.name}</CardTitle>
            <CardDescription>{target.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TargetHealthIndicator health={target.health} label={target.healthLabel} />
            <TargetStatusBadge target={target} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <TargetPreview preview={target.preview} />
        <TargetCapabilityList capabilities={target.capabilities} />
        <ul className="divide-y" aria-label={`Validation ${target.name}`}>
          {target.validations.map((validation) => {
            const Icon = validationIcons[validation.state]
            return (
              <li key={validation.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{validation.label} · {validation.stateLabel}</p>
                  <p className="text-xs text-muted-foreground">{validation.message}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
