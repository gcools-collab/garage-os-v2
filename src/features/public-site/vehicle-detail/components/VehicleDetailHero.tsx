import { AssetImage } from "@/features/media"
import type { VehicleHeroViewModel } from "../presentation"
import { getVehicleHeroImageSizes } from "../presentation"

export function VehicleDetailHero({ hero }: { readonly hero: VehicleHeroViewModel }) {
  return (
    <section className="grid overflow-hidden border-b border-[var(--live-border)] bg-[var(--live-surface)] lg:grid-cols-[1.3fr_1fr]">
      <div className="aspect-[4/3] min-h-72 lg:aspect-auto lg:min-h-[38rem]">
        {hero.cover ? (
          <AssetImage image={hero.cover} priority sizes={getVehicleHeroImageSizes()} />
        ) : (
          <div className="flex size-full items-center justify-center bg-[var(--live-surface-muted)] text-[var(--live-muted-foreground)]">Photo à venir</div>
        )}
      </div>
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--live-muted-foreground)]">{hero.eyebrow}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[var(--live-success)] px-3 py-1 text-sm text-white">{hero.availabilityLabel}</span>
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{hero.title}</h1>
        {hero.version ? <p className="mt-2 text-xl text-[var(--live-muted-foreground)]">{hero.version}</p> : null}
        <p className="mt-8 text-3xl font-semibold">{hero.price}</p>
        <dl className="mt-8 grid grid-cols-2 gap-4">
          {hero.metadata.map((item) => <div key={item.label}><dt className="text-xs text-[var(--live-muted-foreground)]">{item.label}</dt><dd className="mt-1 font-medium">{item.value}</dd></div>)}
        </dl>
      </div>
    </section>
  )
}
