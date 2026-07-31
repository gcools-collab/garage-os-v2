import { Archive, EyeOff, RefreshCcw, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PublicationActionContract } from "../types"

const icons = {
  PUBLISH: Send,
  UNPUBLISH: EyeOff,
  ARCHIVE: Archive,
  REACTIVATE: RefreshCcw,
} as const

export function PublicationActions({
  actions,
}: {
  readonly actions: readonly PublicationActionContract[]
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          Les décisions disponibles sont calculées par le workflow. Leur exécution sera branchée ultérieurement.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = icons[action.type]
          return (
            <Button
              key={action.type}
              type="button"
              variant={action.type === "PUBLISH" ? "default" : "outline"}
              disabled
              aria-label={`${action.label} — action préparée`}
              title={action.enabled ? "Action prête à être branchée" : "Transition indisponible"}
            >
              <Icon aria-hidden="true" />
              {action.label}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
