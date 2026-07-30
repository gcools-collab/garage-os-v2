import Link from "next/link"
import { PublicSiteLayout } from "../../components"
import type { VehicleDetailPageViewModel } from "../presentation"
import { VehicleCTASection } from "./VehicleCTASection"
import { VehicleDetailHero } from "./VehicleDetailHero"
import { VehicleGallerySection } from "./VehicleGallerySection"
import { VehicleOverviewSections } from "./VehicleOverviewSections"
import { VehicleSupportSections } from "./VehicleSupportSections"

export function PremiumVehicleDetailPage({ detail }: { readonly detail: VehicleDetailPageViewModel }) {
  return (
    <PublicSiteLayout garage={detail.garage}>
      <nav aria-label="Fil d’Ariane" className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-4 text-sm text-[var(--live-muted-foreground)] md:px-8">
        {detail.breadcrumbs.map((item, index) => <span key={item.href} className="flex shrink-0 gap-2">{index ? <span aria-hidden="true">/</span> : null}<Link href={item.href} className="hover:underline">{item.label}</Link></span>)}
      </nav>
      <VehicleDetailHero hero={detail.hero} />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 pb-28 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pb-20 md:px-8">
        <div className="space-y-8">
          <VehicleGallerySection gallery={detail.gallery} capabilities={detail.galleryCapabilities} />
          <VehicleOverviewSections detail={detail} />
          <VehicleSupportSections detail={detail} />
          <section className="rounded-2xl bg-[var(--live-primary)] p-8 text-[var(--live-primary-foreground)]">
            <h2 className="text-3xl font-semibold">{detail.cta.title}</h2>
            <p className="mt-3">{detail.cta.description}</p>
            <a href={detail.cta.primary.href} className="mt-6 inline-flex min-h-12 items-center rounded-lg border px-5 font-medium">{detail.cta.primary.label}</a>
          </section>
        </div>
        <div><VehicleCTASection cta={detail.cta} /></div>
      </div>
      <VehicleCTASection cta={detail.cta} mobile />
    </PublicSiteLayout>
  )
}
