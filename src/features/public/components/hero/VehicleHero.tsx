import { CarFront } from "lucide-react"
import Image from "next/image"
import type { HeroContent, Vehicle, VehicleImage } from "../../types"
import { LiveBadge, PriceDisplay, VehicleMeta } from "../ui"
import { HeroCopyBlock } from "./hero-parts"

type VehicleHeroContent = Extract<HeroContent, { mode: "vehicle" }>

export function resolveHeroImage(vehicle: Vehicle): VehicleImage | null {
  return vehicle.displayImage ?? null
}

export function VehicleHero({ hero }: { hero: VehicleHeroContent }) {
  const vehicle = hero.vehicle
  const image = resolveHeroImage(vehicle)
  const vehicleName = [vehicle.brand, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ")

  return (
    <section className="overflow-hidden bg-[var(--live-background)]">
      <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[var(--live-content-width)] items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14 xl:gap-20">
        <div className="relative z-10">
          <HeroCopyBlock hero={hero} />
        </div>

        <article className="group min-w-0 overflow-hidden rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] shadow-2xl shadow-[var(--live-background)] transition duration-300 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
          <div className="relative aspect-[16/10] overflow-hidden bg-[var(--live-muted)]">
            {image ? (
              <Image
                src={image.url}
                alt={image.alt || vehicleName}
                fill
                preload
                sizes="(max-width: 1023px) calc(100vw - 2.5rem), (max-width: 1536px) 52vw, 800px"
                className="object-cover transition duration-300 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 text-[var(--live-muted-foreground)]">
                <CarFront aria-hidden="true" className="size-12" />
                <span className="text-sm">Visuel bientôt disponible</span>
              </div>
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--live-surface)] to-transparent"
            />
          </div>

          <div className="relative -mt-8 p-5 pt-0 sm:p-7 sm:pt-0">
            <LiveBadge>Disponible</LiveBadge>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {vehicleName}
                </h2>
                <div className="mt-3">
                  <VehicleMeta vehicle={vehicle} />
                </div>
              </div>
              <PriceDisplay price={vehicle.sellingPrice} />
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
