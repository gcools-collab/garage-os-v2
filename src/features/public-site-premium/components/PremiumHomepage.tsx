import Image from "next/image"
import Link from "next/link"
import { PublicSiteLayout } from "@/features/public-site/components/PublicSiteLayout"
import type { PremiumHomepageViewModel } from "../presentation"
import { PremiumCustomerActions } from "./PremiumCustomerActions"
import { PremiumQuickSearch } from "./PremiumQuickSearch"
import { FeatureGrid, SectionHeading } from "./PremiumSections"
import { PremiumVehicleCard } from "./PremiumVehicleCard"

const motion = { reveal: "premium-reveal", stagger: "premium-stagger" } as const
export function PremiumHomepage({ homepage }: { readonly homepage: PremiumHomepageViewModel }) {
  return <PublicSiteLayout garage={homepage.garage}>
    <main className="overflow-hidden pb-20 md:pb-0">
      <section className="relative isolate min-h-[520px] md:min-h-[580px] lg:min-h-[600px]">
        {homepage.hero.image ? <Image src={homepage.hero.image.url} alt={homepage.hero.image.alt} fill priority sizes="100vw" className="-z-20 object-cover" /> : null}
        <div className="absolute inset-0 -z-10 bg-[var(--live-overlay)]" />
        <div className={`${motion.reveal} mx-auto flex min-h-[520px] max-w-7xl items-center px-5 py-20 md:min-h-[580px] md:px-8 lg:min-h-[600px]`}><div className="max-w-4xl text-[var(--live-hero-foreground)]"><p className="text-sm font-semibold uppercase tracking-[0.22em]">{homepage.hero.eyebrow}</p><h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">{homepage.hero.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 opacity-90">{homepage.hero.description}</p><div className="mt-9">{homepage.hero.actions.map(action => <Link key={action.href} href={action.href} className="inline-flex rounded-xl bg-[var(--live-primary)] px-5 py-3 font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">{action.label}</Link>)}</div></div></div>
      </section>
      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-5 md:px-8"><PremiumQuickSearch search={homepage.search} /></section>
      {homepage.latest.vehicles.length ? <section className="bg-[var(--live-surface-muted)]"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8"><SectionHeading heading={homepage.latest.heading} /><div className={`${motion.stagger} mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-3`}>{homepage.latest.vehicles.map(vehicle => <PremiumVehicleCard key={vehicle.id} vehicle={vehicle} />)}</div><Link href={`${homepage.garage.homeHref}/stock`} className="mt-9 inline-flex min-h-12 items-center rounded-xl bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">Voir tous nos véhicules</Link></div></section> : null}
      {homepage.services.items.length ? <section className="mx-auto max-w-7xl px-5 py-16 md:px-8"><SectionHeading heading={homepage.services.heading} centered /><FeatureGrid items={homepage.services.items} /></section> : null}
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1fr_auto] lg:items-end md:px-8"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">Contact</p><h2 className="mt-3 text-3xl font-semibold">{homepage.contact.title}</h2><p className="mt-4 text-[var(--live-muted-foreground)]">{homepage.contact.description}</p><address className="mt-6 space-y-2 not-italic text-sm">{homepage.contact.address ? <p>{homepage.contact.address}</p> : null}{homepage.contact.phone ? <a className="block hover:underline" href={homepage.contact.phone.href}>{homepage.contact.phone.label}</a> : null}{homepage.contact.email ? <a className="block hover:underline" href={homepage.contact.email.href}>{homepage.contact.email.label}</a> : null}</address></div><Link href={homepage.contact.action.href} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)]">{homepage.contact.action.label}</Link></section>
    </main>
    <PremiumCustomerActions homepage={homepage}/>
  </PublicSiteLayout>
}
