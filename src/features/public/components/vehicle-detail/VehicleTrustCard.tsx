import { BadgeCheck, CarFront, Handshake, Headphones, History, ShieldCheck } from "lucide-react"
import type { ComponentType } from "react"
import type { LiveTrustIcon, LiveVehicleTrustItem } from "../../types"

const trustIcons: Record<LiveTrustIcon, ComponentType<{ className?: string }>> = {
  shield: ShieldCheck,
  inspection: BadgeCheck,
  "trade-in": Handshake,
  delivery: CarFront,
  history: History,
  support: Headphones,
}

export function VehicleTrustCard({ item }: { item: LiveVehicleTrustItem }) {
  const Icon = trustIcons[item.icon] ?? ShieldCheck
  return (
    <article className="rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] p-5">
      <span aria-hidden="true"><Icon className="size-6 text-[var(--live-primary)]" /></span>
      <h3 className="mt-4 font-semibold">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--live-muted-foreground)]">{item.description}</p>
    </article>
  )
}
