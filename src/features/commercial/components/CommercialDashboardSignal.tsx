import Link from "next/link"
import { ArrowRight, BriefcaseBusiness } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CommercialDashboardSignalViewModel } from "../types"

export function CommercialDashboardSignal({
  signal,
}: {
  readonly signal: CommercialDashboardSignalViewModel
}) {
  return (
    <Card className={signal.overdue ? "ring-orange-500/30" : ""}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <BriefcaseBusiness className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-semibold">{signal.headline}</p>
            {signal.recommendation ? <p className="mt-1 text-sm text-muted-foreground">{signal.recommendation}</p> : null}
          </div>
        </div>
        <Button asChild><Link href={signal.href}>Ouvrir la boîte commerciale <ArrowRight aria-hidden="true" /></Link></Button>
      </CardContent>
    </Card>
  )
}
