import Link from "next/link"
import type { PublicHomepageViewModel } from "../types"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"
import { PublicMediaImage } from "./PublicMediaImage"
import { PublicSiteLayout } from "./PublicSiteLayout"
import { VehiclePublicCard } from "./VehiclePublicCard"

function VehiclesSection({
  title,
  description,
  vehicles,
}: {
  readonly title: string
  readonly description: string
  readonly vehicles: PublicHomepageViewModel["featuredVehicles"]
}) {
  if (!vehicles.length) return null
  return (
    <section className="mx-auto max-w-7xl space-y-8 px-5 py-16 md:px-8">
      <div><h2 className="text-3xl font-semibold">{title}</h2><p className="mt-2 text-[var(--live-muted-foreground)]">{description}</p></div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => <VehiclePublicCard key={vehicle.id} vehicle={vehicle} />)}
      </div>
    </section>
  )
}

export function PublicHomepage({ homepage }: { readonly homepage: PublicHomepageViewModel }) {
  const section = (id: PublicHomepageViewModel["sections"][number]["id"]) =>
    homepage.sections.find((candidate) => candidate.id === id)
  const hero = homepage.hero
  const heroImage = hero.image && isResolvableVehicleImageUrl(hero.image.url) ? hero.image : null
  return (
    <PublicSiteLayout garage={homepage.garage}>
      <section className="relative isolate min-h-[70vh] overflow-hidden">
        {heroImage ? <PublicMediaImage src={heroImage.url} alt={heroImage.alt} priority sizes="100vw" className="-z-20 object-cover" /> : null}
        <div className="absolute inset-0 -z-10 bg-[var(--live-background)]/75" />
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center px-5 py-20 md:px-8">
          <div className="max-w-5xl">
            <p className="font-medium">{hero.eyebrow}</p>
            <h1 className="mt-4 max-w-[16ch] text-4xl font-semibold tracking-tight text-balance sm:max-w-[22ch] sm:text-5xl md:max-w-none md:text-6xl">{hero.title}</h1>
            <p className="mt-6 max-w-2xl text-lg">{hero.description}</p>
            <div className="relative z-10 mt-8 flex flex-wrap gap-4 sm:mt-10">
              <Link href={hero.primaryAction.href} className="rounded-lg bg-[var(--live-primary)] px-5 py-3 font-medium text-[var(--live-primary-foreground)]">{hero.primaryAction.label}</Link>
              {hero.secondaryAction ? <a href={hero.secondaryAction.href} className="rounded-lg border border-[var(--live-border)] px-5 py-3 font-medium">{hero.secondaryAction.label}</a> : null}
            </div>
          </div>
        </div>
      </section>
      {section("SEARCH")?.enabled ? (
        <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <form action={homepage.quickSearch.action} className="grid gap-3 rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface)] p-6 sm:grid-cols-[1fr_1fr_auto]">
            <select name="brand" aria-label="Marque" className="min-h-11 rounded-lg border border-[var(--live-border)] bg-transparent px-3"><option value="">Toutes les marques</option>{homepage.quickSearch.brands.map((brand) => <option key={brand}>{brand}</option>)}</select>
            <select name="fuel" aria-label="Énergie" className="min-h-11 rounded-lg border border-[var(--live-border)] bg-transparent px-3"><option value="">Toutes les énergies</option>{homepage.quickSearch.fuels.map((fuel) => <option key={fuel}>{fuel}</option>)}</select>
            <button className="min-h-11 rounded-lg bg-[var(--live-primary)] px-5 text-[var(--live-primary-foreground)]">Rechercher</button>
          </form>
        </section>
      ) : null}
      <VehiclesSection title={section("FEATURED")?.title ?? ""} description={section("FEATURED")?.description ?? ""} vehicles={homepage.featuredVehicles} />
      <VehiclesSection title={section("LATEST")?.title ?? ""} description={section("LATEST")?.description ?? ""} vehicles={homepage.latestVehicles} />
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-16 md:grid-cols-2 lg:grid-cols-4 md:px-8">
        {homepage.sections.filter((item) => item.enabled && ["WHY_US", "SERVICES", "FINANCING", "TRADE_IN"].includes(item.id)).map((item) => (
          <article key={item.id} className="rounded-2xl border border-[var(--live-border)] p-6"><h2 className="text-xl font-semibold">{item.title}</h2><p className="mt-3 text-sm text-[var(--live-muted-foreground)]">{item.description}</p></article>
        ))}
      </section>
      <section className="bg-[var(--live-primary)] text-[var(--live-primary-foreground)]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8"><h2 className="text-3xl font-semibold">{section("CONTACT")?.title}</h2><p className="mt-3">{section("CONTACT")?.description}</p><Link href={`${homepage.garage.homeHref}/contact`} className="mt-6 inline-flex rounded-lg border px-5 py-3">Nous contacter</Link></div>
      </section>
    </PublicSiteLayout>
  )
}
