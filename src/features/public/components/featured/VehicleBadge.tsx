import { Heart } from "lucide-react"
import type { LiveVehicleBadge } from "../../types"
import { LiveBadge } from "../ui"

export function VehicleBadge({ badge }: { badge?: LiveVehicleBadge }) {
  if (!badge) return null

  return (
    <LiveBadge>
      <span className="inline-flex items-center gap-1.5">
        <Heart aria-hidden="true" className="size-3" />
        {badge.label}
      </span>
    </LiveBadge>
  )
}
