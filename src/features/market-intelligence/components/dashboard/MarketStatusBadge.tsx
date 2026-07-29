import { Badge } from "@/components/ui/badge"
import type { MarketPresentationStatus, PresentationTone } from "../../presentation"

const toneClasses: Record<PresentationTone, string> = {
  positive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
}

export function MarketStatusBadge({ status }: { status: MarketPresentationStatus }) {
  return <Badge variant="outline" className={toneClasses[status.tone]}>{status.label}</Badge>
}
export { toneClasses }
