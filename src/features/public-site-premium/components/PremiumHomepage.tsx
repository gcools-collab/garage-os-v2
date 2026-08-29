import { MapPin, Star } from "lucide-react"
import Link from "next/link"
import { PublicMediaImage } from "@/features/public-site/components/PublicMediaImage"
import { PublicSiteLayout } from "@/features/public-site/components/PublicSiteLayout"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"
import type { PremiumHomepageViewModel } from "../presentation"
import { PremiumCustomerActions } from "./PremiumCustomerActions"
import { PremiumQuickSearch } from "./PremiumQuickSearch"
import { FeatureGrid, SectionHeading } from "./PremiumSections"
import { PremiumVehicleCard } from "./PremiumVehicleCard"

const motion = { reveal: "premium-reveal", stagger: "premium-stagger" } as const
export function PremiumHomepage({ homepage }: { readonly homepage: PremiumHomepageViewModel }) {
  const heroImage = homepage.hero.image && isResolvableVehicleImageUrl(homepage.hero.image.url) ? homepage.hero.image : null
  const mapHref = homepage.contact.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(homepage.contact.address)}` : null
  const googleSearchHref = `https://www.google.com/search?q=${encodeURIComponent(`avis ${homepage.garage.name}${homepage.contact.address ? ` ${homepage.contact.address}` : ""}`)}`
  const stockHref = `${homepage.garage.homeHref}/stock`
  return <PublicSiteLayout garage={homepage.garage}>
    <main className="overflow-hidden pb-32 md:pb-28">
      <section className="relative isolate min-h-[560px] md:min-h-[620px] lg:min-h-[660px]">
        {heroImage ? <PublicMediaImage src={heroImage.url} alt={heroImage.alt} priority sizes="100vw" className="-z-20 object-cover" /> : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--live-overlay)] via-[var(--live-overlay)] to-[var(--live-overlay)]/70" />
        <div className={`${motion.reveal} relative z-10 mx-auto flex min-h-[560px] max-w-7xl flex-col justify-center px-5 pb-28 pt-20 md:min-h-[620px] md:px-8 lg:min-h-[660px]`}>
          <div className="max-w-4xl text-[var(--live-hero-foreground)]">
            <p className="inline-flex items-center rounded-full border border-[var(--live-hero-foreground)]/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]">{homepage.hero.eyebrow}</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">{homepage.hero.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 opacity-90">{homepage.hero.description}</p>
            <div className="relative z-20 mt-9 flex flex-wrap gap-3">
              {homepage.hero.actions.map(action => <Link key={action.href} href={action.href} className="inline-flex min-h-12 items-center rounded-xl bg-[var(--live-primary)] px-5 py-3 font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">{action.label}</Link>)}
              {homepage.garage.phoneHref ? <a href={homepage.garage.phoneHref} className="inline-flex min-h-12 items-center rounded-xl border border-[var(--live-hero-foreground)]/40 px-5 py-3 font-semibold text-[var(--live-hero-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">Appeler le garage</a> : null}
            </div>
          </div>
          {homepage.whyUs.items.length ? <ul className="mt-14 grid gap-x-8 gap-y-5 text-[var(--live-hero-foreground)] sm:grid-cols-3">{homepage.whyUs.items.map(item => <li key={item.id} className="flex items-start gap-3"><span aria-hidden="true" className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">✓</span><span className="text-sm font-medium leading-snug">{item.title}</span></li>)}</ul> : null}
        </div>
      </section>
      <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-5 md:px-8"><PremiumQuickSearch search={homepage.search} /></section>
      {homepage.latest.vehicles.length ? <section className="bg-[var(--live-surface-muted)]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8"><SectionHeading heading={homepage.latest.heading} /><div className={`${motion.stagger} mt-9 grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3`}>{homepage.latest.vehicles.map(vehicle => <PremiumVehicleCard key={vehicle.id} vehicle={vehicle} />)}</div><Link href={stockHref} className="mt-9 inline-flex min-h-12 items-center rounded-xl bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">Voir tous nos véhicules</Link></div></section> : null}
      {homepage.services.items.length ? <section className="mx-auto max-w-7xl px-5 py-16 md:px-8"><SectionHeading heading={homepage.services.heading} centered /><FeatureGrid items={homepage.services.items} /></section> : null}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="rounded-3xl border border-[var(--live-border)] bg-[var(--live-surface)] p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <SectionHeading heading={homepage.reviews.heading} />
              <p className="mt-5 flex items-center gap-2 text-sm text-[var(--live-muted-foreground)]"><Star className="size-4 shrink-0" aria-hidden="true" />{homepage.reviews.message}</p>
            </div>
            <a href={googleSearchHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-[var(--live-border-strong)] px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">Voir nos avis sur Google</a>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1fr_auto] lg:items-end md:px-8"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">Contact</p><h2 className="mt-3 text-3xl font-semibold">{homepage.contact.title}</h2><p className="mt-4 text-[var(--live-muted-foreground)]">{homepage.contact.description}</p><address className="mt-6 space-y-2 not-italic text-sm">{homepage.contact.address ? <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />{homepage.contact.address}</p> : null}{homepage.contact.phone ? <a className="block hover:underline" href={homepage.contact.phone.href}>{homepage.contact.phone.label}</a> : null}{homepage.contact.email ? <a className="block hover:underline" href={homepage.contact.email.href}>{homepage.contact.email.label}</a> : null}</address></div><div className="flex flex-wrap gap-3"><Link href={homepage.contact.action.href} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)]">{homepage.contact.action.label}</Link>{mapHref ? <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--live-border-strong)] px-6 font-semibold">Itinéraire</a> : null}</div></section>
    </main>
    <PremiumCustomerActions homepage={homepage}/>
  </PublicSiteLayout>
}
