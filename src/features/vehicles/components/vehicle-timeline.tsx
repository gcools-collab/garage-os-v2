import { Camera, Car, CircleDollarSign, Megaphone, Pencil, ShoppingCart, Wrench } from "lucide-react"

import { getVehicleStatusLabel, type VehicleStatus } from "../status-badge"

export type VehicleTimelineEvent = {
  id: string
  type: VehicleStatus
  description: string | null
  created_at: string
}

const date = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

function getEventIcon(event: VehicleTimelineEvent) {
  const description = event.description?.toLocaleLowerCase("fr-FR") ?? ""
  if (description.includes("photo")) return Camera
  if (description.includes("coût")) return CircleDollarSign
  if (description.includes("répar") || description.includes("mécan")) return Wrench
  if (event.type === "PURCHASED") return ShoppingCart
  if (event.type === "PUBLISHED") return Megaphone
  if (event.type === "SOLD") return Car
  return Pencil
}

export function VehicleTimeline({ events }: { events: VehicleTimelineEvent[] }) {
  if (events.length === 0) {
    return <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">Aucun événement enregistré.</div>
  }

  return (
    <div className="space-y-1">
      {events.map((event, index) => {
        const Icon = getEventIcon(event)
        return (
          <div key={event.id} className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
            {index < events.length - 1 && <span className="absolute bottom-0 left-[17px] top-9 w-px bg-border" />}
            <span className="relative z-10 flex size-9 items-center justify-center rounded-full border bg-background">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="pt-1">
              <p className="font-medium">{getVehicleStatusLabel(event.type)}</p>
              {event.description && <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>}
              <time className="mt-1.5 block text-xs text-muted-foreground">{date.format(new Date(event.created_at))}</time>
            </div>
          </div>
        )
      })}
    </div>
  )
}
