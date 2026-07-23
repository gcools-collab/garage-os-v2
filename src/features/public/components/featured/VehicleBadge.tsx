import { Heart } from "lucide-react"
import type { Vehicle } from "../../types"
import { LiveBadge } from "../ui"

export function VehicleBadge({ vehicle }: { vehicle: Vehicle }) {
  if (!vehicle.featured) return null

  return (
    <LiveBadge>
      <span className="inline-flex items-center gap-1.5">
        <Heart aria-hidden="true" className="size-3" />
        Coup de cœur
      </span>
    </LiveBadge>
  )
}
