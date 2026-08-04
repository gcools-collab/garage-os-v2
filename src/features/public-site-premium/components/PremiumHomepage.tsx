import Image from "next/image"
import Link from "next/link"
import { PublicSiteLayout } from "@/features/public-site/components/PublicSiteLayout"
import type { PremiumHomepageViewModel } from "../presentation"
const motion = { reveal: "premium-reveal", stagger: "premium-stagger" } as const
import { PremiumQuickSearch } from "./PremiumQuickSearch"
import { PremiumVehicleCard } from "./PremiumVehicleCard"
import { ConversionPanels, FeatureGrid, SectionHeading } from "./PremiumSections"

export function PremiumHomepage({ homepage }: { readonly homepage: PremiumHomepageViewModel }) {
  return <PublicSiteLayout garage={homepage.garage}>
    <main className="overflow-hidden">
      <section className="relative isolate min-h-[78vh]">
        {homepage.hero.image ? <Image src={homepage.hero.image.url} alt={homepage.hero.image.alt} fill priority sizes="100vw" className="-z-20 object-cover" /> : null}
        <div className="absolute inset-0 -z-10 bg-[var(--live-overlay)]" />
        <div className={`${motion.reveal} mx-auto flex min-h-[78vh] max-w-7xl items-center px-5 py-24 md:px-8`}><div className="max-w-4xl text-[var(--live-primary-foreground)]"><p className="text-sm font-semibold uppercase tracking-[0.22em]">{homepage.hero.eyebrow}</p><h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">{homepage.hero.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 opacity-90">{homepage.hero.description}</p><div className="mt-9 flex flex-wrap gap-3">{homepage.hero.actions.map((action, index) => <Link key={action.href} href={action.href} className={index === 0 ? "rounded-xl bg-[var(--live-primary)] px-5 py-3 font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]" : "rounded-xl border border-[var(--live-border-strong)] bg-[var(--live-surface)]/15 px-5 py-3 font-semibold backdrop-blur focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]"}>{action.label}</Link>)}</div></div></div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-5 md:px-8"><PremiumQuickSearch search={homepage.search} /></section>

      {homepage.featured.vehicle ? <section className="mx-auto max-w-7xl px-5 py-20 md:px-8"><SectionHeading heading={homepage.featured.heading} /><div className="mt-9"><PremiumVehicleCard vehicle={homepage.featured.vehicle} featured /></div></section> : null}

      {homepage.latest.vehicles.length ? <section className="bg-[var(--live-surface-muted)]"><div className="mx-auto max-w-7xl px-5 py-20 md:px-8"><SectionHeading heading={homepage.latest.heading} /><div className={`${motion.stagger} mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-3`}>{homepage.latest.vehicles.map((vehicle) => <PremiumVehicleCard key={vehicle.id} vehicle={vehicle} />)}</div></div></section> : null}

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8"><SectionHeading heading={homepage.services.heading} centered /><FeatureGrid items={homepage.services.items} /></section>
      <section className="border-y border-[var(--live-border)] bg-[var(--live-surface)]"><div className="mx-auto max-w-7xl px-5 py-20 md:px-8"><SectionHeading heading={homepage.whyUs.heading} /><FeatureGrid items={homepage.whyUs.items} /></div></section>
      <ConversionPanels tradeIn={homepage.tradeIn} />

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8"><div className="rounded-3xl border border-[var(--live-border)] p-8 text-center"><SectionHeading heading={homepage.reviews.heading} centered /><p className="mt-6 text-sm text-[var(--live-muted-foreground)]">{homepage.reviews.message}</p></div></section>

      <section aria-label="Chiffres clés" className="mx-auto grid max-w-7xl gap-4 px-5 py-12 sm:grid-cols-3 md:px-8">{homepage.metrics.map((metric) => <div key={metric.id} className="rounded-2xl bg-[var(--live-surface)] p-6 text-center"><p className="text-4xl font-semibold tabular-nums text-[var(--live-primary)]">{metric.value}</p><p className="mt-2 text-sm text-[var(--live-muted-foreground)]">{metric.label}</p></div>)}</section>

      <section className="bg-[var(--live-primary)] text-[var(--live-primary-foreground)]"><div className="mx-auto max-w-5xl px-5 py-20 text-center md:px-8"><h2 className="text-3xl font-semibold md:text-5xl">{homepage.primaryCta.title}</h2><p className="mx-auto mt-5 max-w-2xl opacity-85">{homepage.primaryCta.description}</p><div className="mt-8 flex flex-wrap justify-center gap-3">{homepage.primaryCta.actions.map((action) => <Link key={action.href} href={action.href} className="rounded-xl border border-current px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">{action.label}</Link>)}</div></div></section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[1fr_auto] lg:items-end md:px-8"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">Contact</p><h2 className="mt-3 text-3xl font-semibold">{homepage.contact.title}</h2><p className="mt-4 text-[var(--live-muted-foreground)]">{homepage.contact.description}</p><address className="mt-6 space-y-2 not-italic text-sm">{homepage.contact.address ? <p>{homepage.contact.address}</p> : null}{homepage.contact.phone ? <a className="block hover:underline" href={homepage.contact.phone.href}>{homepage.contact.phone.label}</a> : null}{homepage.contact.email ? <a className="block hover:underline" href={homepage.contact.email.href}>{homepage.contact.email.label}</a> : null}</address></div><Link href={homepage.contact.action.href} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)]">{homepage.contact.action.label}</Link></section>
    </main>
    <nav aria-label="Actions rapides" className="fixed inset-x-3 bottom-3 z-40 flex justify-center gap-2 rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface-elevated)]/95 p-2 shadow-[0_12px_36px_var(--live-shadow-color)] backdrop-blur md:left-auto md:right-5 md:w-auto">{homepage.floatingCta.map((action) => <a key={action.id} href={action.href} className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]">{action.label}</a>)}</nav>
  </PublicSiteLayout>
}
