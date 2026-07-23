import { ArrowUpRight, CarFront } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { LiveVehicleCard } from "../../types"
import { PriceDisplay, VehicleMeta } from "../ui"
import { VehicleBadge } from "./VehicleBadge"

export function PublicVehicleCard({ vehicle }: { vehicle: LiveVehicleCard }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] transition duration-300 lg:hover:-translate-y-1 lg:hover:border-[var(--live-primary)] lg:hover:shadow-xl lg:hover:shadow-[var(--live-background)] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--live-muted)]">
        {vehicle.image ? (
          <Image
            src={vehicle.image.url}
            alt={vehicle.image.alt || vehicle.displayName}
            fill
            sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1023px) calc(50vw - 2.5rem), (max-width: 1536px) calc(33vw - 2.5rem), 410px"
            className="object-cover transition duration-300 lg:group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 text-[var(--live-muted-foreground)]">
            <CarFront aria-hidden="true" className="size-10" />
            <span className="text-sm">Visuel bientôt disponible</span>
          </div>
        )}
        <div className="absolute left-4 top-4">
          <VehicleBadge badge={vehicle.badge} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-xl font-semibold tracking-tight">{vehicle.displayName}</h3>
        <div className="mt-3">
          <VehicleMeta items={vehicle.metadata} />
        </div>
        <div className="mt-6">
          <PriceDisplay price={vehicle.price ?? undefined} />
        </div>
        <Link
          href={vehicle.href}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--live-control-radius)] border border-[var(--live-border)] px-4 py-2.5 text-sm font-semibold text-[var(--live-foreground)] transition duration-200 lg:group-hover:border-[var(--live-primary)] lg:group-hover:bg-[var(--live-primary)] lg:group-hover:text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)] motion-reduce:transition-none"
          aria-label={`Voir le véhicule ${vehicle.displayName}`}
        >
          Voir le véhicule
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  )
}
