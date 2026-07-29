import { ArrowUpRight, CircleCheck } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardListItemViewModel } from "../types"

export function PriorityList({ priorities }: { readonly priorities: readonly DashboardListItemViewModel[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Actions prioritaires</CardTitle>
        <CardDescription>Les prochaines actions utiles pour faire avancer le stock.</CardDescription>
      </CardHeader>
      <CardContent>
        {priorities.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-emerald-800">
            <CircleCheck className="size-4" aria-hidden="true" />
            Aucune action prioritaire.
          </p>
        ) : (
          <ul className="divide-y">
            {priorities.map((priority) => (
              <li key={priority.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-orange-600" aria-hidden="true" />
                <div>
                  <p className="font-medium">{priority.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{priority.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
