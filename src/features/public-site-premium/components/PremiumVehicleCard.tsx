import Link from "next/link"
import { PublicMediaImage } from "@/features/public-site/components/PublicMediaImage"
import type { VehiclePublicCardViewModel } from "@/features/public-site/types"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"

export function PremiumVehicleCard({ vehicle, featured = false }: { readonly vehicle: VehiclePublicCardViewModel; readonly featured?: boolean }) {
  const hasImage = vehicle.image && isResolvableVehicleImageUrl(vehicle.image.url)
  return <article className={`premium-card group overflow-hidden rounded-3xl border border-[var(--live-border)] bg-[var(--live-surface-elevated)] ${featured ? "grid lg:grid-cols-[1.25fr_0.75fr]" : "flex h-full flex-col"}`}>
    <Link href={vehicle.href} aria-label={`Voir ${vehicle.name}`} className={`relative block overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)] ${featured ? "aspect-[4/3] lg:min-h-[18rem]" : "aspect-[4/3]"}`}>
      {hasImage ? <PublicMediaImage src={vehicle.image.url} alt={vehicle.image.alt} sizes={featured ? "(max-width: 1024px) 100vw, 65vw" : "(max-width: 768px) 100vw, 33vw"} className="object-cover" priority={featured} /> : <div className="grid size-full place-items-center bg-[var(--live-surface-muted)] px-4 text-center text-sm text-[var(--live-muted-foreground)]">Photo à venir</div>}
      {vehicle.badges.length ? <div className="absolute left-4 top-4 flex flex-wrap gap-2">{vehicle.badges.map((badge) => <span key={badge} className="rounded-full bg-[var(--live-background)]/90 px-3 py-1 text-xs font-semibold text-[var(--live-foreground)] backdrop-blur">{badge}</span>)}</div> : null}
    </Link>
    <div className={`flex flex-1 flex-col ${featured ? "justify-center p-7 md:p-10" : "p-5"}`}>
      {vehicle.bodyType ? <p className="text-xs font-medium tracking-wide text-[var(--live-muted-foreground)]">{vehicle.bodyType}</p> : null}
      <h3 className={`${featured ? "mt-3 text-3xl" : vehicle.bodyType ? "mt-2 text-xl" : "text-xl"} font-semibold tracking-tight`}><Link href={vehicle.href} className="focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]">{vehicle.name}</Link></h3>
      {vehicle.version ? <p className="mt-1 text-sm text-[var(--live-muted-foreground)]">{vehicle.version}</p> : null}
      <p className={`${featured ? "mt-6 text-3xl" : "mt-4 text-2xl"} font-semibold tabular-nums text-[var(--live-primary)]`}>{vehicle.price}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-[var(--live-muted-foreground)]"><div><dt className="sr-only">Année</dt><dd>{vehicle.year}</dd></div><div><dt className="sr-only">Kilométrage</dt><dd>{vehicle.mileage}</dd></div><div><dt className="sr-only">Énergie</dt><dd>{vehicle.fuel}</dd></div><div><dt className="sr-only">Boîte</dt><dd>{vehicle.gearbox}</dd></div></dl>
      <Link href={vehicle.href} className="mt-auto inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--live-primary)] px-5 text-center font-medium text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">Découvrir ce véhicule</Link>
    </div>
  </article>
}
