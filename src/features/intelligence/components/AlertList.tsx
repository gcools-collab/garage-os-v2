import { AlertTriangle, CircleCheck } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardListItemViewModel } from "../types"

export function AlertList({ alerts }: { readonly alerts: readonly DashboardListItemViewModel[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Alertes</CardTitle>
        <CardDescription>Les échéances et anomalies qui nécessitent votre vigilance.</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800">
            <CircleCheck className="size-4" aria-hidden="true" />
            Aucune alerte active.
          </p>
        ) : (
          <ul className="divide-y">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
