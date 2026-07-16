import { ListChecks } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StockCompleteness({ percentage }: { percentage: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Complétude du stock</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{percentage} %</p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Complétude moyenne du stock"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Moyenne de tous les véhicules</p>
      </CardContent>
    </Card>
  )
}
