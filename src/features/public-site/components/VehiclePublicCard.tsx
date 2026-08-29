import Link from "next/link"
import type { VehiclePublicCardViewModel } from "../types"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"
import { getPublicVehicleImageSizes } from "../presentation/responsive"
import { PublicMediaImage } from "./PublicMediaImage"

export function VehiclePublicCard({ vehicle }: { readonly vehicle: VehiclePublicCardViewModel }) {
  const hasImage = vehicle.image && isResolvableVehicleImageUrl(vehicle.image.url)
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--live-muted)]">
        {hasImage ? (
          <PublicMediaImage
            src={vehicle.image.url}
            alt={vehicle.image.alt}
            sizes={getPublicVehicleImageSizes()}
            className="object-cover transition-transform duration-300 motion-reduce:transition-none md:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-[var(--live-muted-foreground)]">Photo à venir</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="text-sm text-[var(--live-muted-foreground)]">{vehicle.version}</p>
          <h3 className="text-xl font-semibold">{vehicle.name}</h3>
        </div>
        <p className="text-2xl font-semibold">{vehicle.price}</p>
        <dl className="grid grid-cols-2 gap-2 text-sm text-[var(--live-muted-foreground)]">
          <div><dt className="sr-only">Année</dt><dd>{vehicle.year}</dd></div>
          <div><dt className="sr-only">Kilométrage</dt><dd>{vehicle.mileage}</dd></div>
          <div><dt className="sr-only">Énergie</dt><dd>{vehicle.fuel}</dd></div>
          <div><dt className="sr-only">Boîte</dt><dd>{vehicle.gearbox}</dd></div>
        </dl>
        <Link
          href={vehicle.href}
          className="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--live-primary)] px-4 font-medium text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Voir le véhicule
        </Link>
      </div>
    </article>
  )
}
