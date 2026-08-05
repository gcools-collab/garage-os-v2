import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  buildPublicHomepage,
  buildPublicSeo,
  getPublicSiteRecord,
  logPublicRouteDiagnostic,
} from "@/features/public-site"
import { PremiumHomepage, PremiumHomepageBuilder } from "@/features/public-site-premium"

type Props = { readonly params: Promise<{ readonly garageSlug: string }> }

async function load(params: Props["params"]) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  return record ? buildPublicHomepage(record.garage, record.vehicles) : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const homepage = await load(params)
  if (!homepage) return { title: "Site indisponible", robots: { index: false } }
  const seo = buildPublicSeo({
    garage: homepage.garage,
    canonicalPath: homepage.garage.homeHref,
    imageUrl: homepage.hero.image?.url,
  })
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    openGraph: { title: seo.title, description: seo.description, images: seo.openGraphImage ? [seo.openGraphImage] : undefined },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: seo.openGraphImage ? [seo.openGraphImage] : undefined },
  }
}

export default async function GaragePublicHomepage({ params }: Props) {
  const resolvedParams = await params
  const homepage = await load(Promise.resolve(resolvedParams))
  if (!homepage) {
    logPublicRouteDiagnostic({ route: "/g/[garageSlug]", slug: resolvedParams.garageSlug, garageId: null, liveSlug: null, activeGarageId: null, serviceCount: 0, repositoryResult: "NOT_FOUND", reason: "public_homepage_record_missing" })
    notFound()
  }
  const seo = buildPublicSeo({ garage: homepage.garage, canonicalPath: homepage.garage.homeHref, imageUrl: homepage.hero.image?.url })
  const premium = new PremiumHomepageBuilder().build(homepage)
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.structuredData).replace(/</g, "\\u003c") }} /><PremiumHomepage homepage={premium} /></>
}
