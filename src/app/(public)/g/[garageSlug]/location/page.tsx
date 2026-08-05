import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { buildPublicProgram, buildPublicSeo, getPublicSiteRecord, logPublicRouteDiagnostic, PublicProgramPage } from "@/features/public-site"

type Props = { readonly params: Promise<{ readonly garageSlug: string }> }
async function load(params: Props["params"]) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  return { garageSlug, record, page: record ? buildPublicProgram(record.garage, "RENTAL") : null }
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await load(params)
  if (!page) return { title: "Location indisponible", robots: { index: false } }
  const seo = buildPublicSeo({ garage: page.garage, pageTitle: "Location", description: page.description, canonicalPath: `${page.garage.homeHref}/location` })
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonicalPath } }
}
export default async function RentalRoute({ params }: Props) {
  const { page, garageSlug, record } = await load(params)
  if (!page) {
    logPublicRouteDiagnostic({ route: "/g/[garageSlug]/location", slug: garageSlug, garageId: record?.garage.garageId ?? null, liveSlug: record?.garage.garageSlug ?? null, activeGarageId: null, serviceCount: record?.garage.serviceConfigurations?.length ?? 0, repositoryResult: record ? "FOUND" : "NOT_FOUND", reason: record ? "rental_service_disabled" : "public_garage_missing" })
    notFound()
  }
  return <PublicProgramPage page={page} />
}
