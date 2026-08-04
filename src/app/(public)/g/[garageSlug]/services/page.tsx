import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { buildPublicSeo, buildPublicServices, getPublicSiteRecord, PublicServicesPage } from "@/features/public-site"

type Props = { readonly params: Promise<{ readonly garageSlug: string }> }

async function load(params: Props["params"]) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  return record ? buildPublicServices(record.garage) : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load(params)
  if (!page) return { title: "Services indisponibles", robots: { index: false } }
  const seo = buildPublicSeo({ garage: page.garage, pageTitle: "Services", description: page.description, canonicalPath: `${page.garage.homeHref}/services` })
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonicalPath } }
}

export default async function ServicesRoute({ params }: Props) {
  const page = await load(params)
  if (!page) notFound()
  return <PublicServicesPage page={page} />
}
