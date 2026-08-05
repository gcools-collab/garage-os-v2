import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { buildPublicSeo, buildPublicServices, getPublicSiteRecord, logPublicRouteDiagnostic, PublicServicesPage } from "@/features/public-site"

type Props = { readonly params: Promise<{ readonly garageSlug: string }> }

async function load(params: Props["params"]) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  return { garageSlug, record, page: record ? buildPublicServices(record.garage) : null }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await load(params)
  if (!page) return { title: "Services indisponibles", robots: { index: false } }
  const seo = buildPublicSeo({ garage: page.garage, pageTitle: "Services", description: page.description, canonicalPath: `${page.garage.homeHref}/services` })
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonicalPath } }
}

export default async function ServicesRoute({ params }: Props) {
  const { page, garageSlug, record } = await load(params)
  if (!page) {
    logPublicRouteDiagnostic({ route: "/g/[garageSlug]/services", slug: garageSlug, garageId: record?.garage.garageId ?? null, liveSlug: record?.garage.garageSlug ?? null, activeGarageId: null, serviceCount: record?.garage.serviceConfigurations?.length ?? 0, repositoryResult: record ? "FOUND" : "NOT_FOUND", reason: record ? "services_view_model_missing" : "public_garage_missing" })
    notFound()
  }
  return <PublicServicesPage page={page} />
}
