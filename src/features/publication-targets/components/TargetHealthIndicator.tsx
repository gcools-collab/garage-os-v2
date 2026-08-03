import { Circle } from "lucide-react"
import type { PublicationTargetViewModel } from "../presentation"

const colors = {
  ONLINE: "text-emerald-600",
  OFFLINE: "text-red-600",
  DEGRADED: "text-orange-500",
  UNKNOWN: "text-muted-foreground",
} as const

export function TargetHealthIndicator({
  health,
  label,
}: {
  readonly health: PublicationTargetViewModel["health"]
  readonly label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Circle className={`size-2 fill-current ${colors[health]}`} aria-hidden="true" />
      {label}
    </span>
  )
}
