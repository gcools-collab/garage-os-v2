import { Download } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardImports } from "../types/dashboard"

export function ImportStats({ imports }: { imports: DashboardImports }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="size-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Imports récents</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-2xl font-semibold tabular-nums">{imports.today}</p>
          <p className="mt-1 text-xs text-muted-foreground">Aujourd&apos;hui</p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-2xl font-semibold tabular-nums">{imports.thisWeek}</p>
          <p className="mt-1 text-xs text-muted-foreground">Cette semaine</p>
        </div>
      </CardContent>
    </Card>
  )
}
