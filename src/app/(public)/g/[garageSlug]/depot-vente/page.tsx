import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { buildPublicProgram, buildPublicSeo, getPublicSiteRecord, PublicProgramPage } from "@/features/public-site"

type Props = { readonly params: Promise<{ readonly garageSlug: string }> }
async function load(params: Props["params"]) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  return record ? buildPublicProgram(record.garage, "CONSIGNMENT") : null
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load(params)
  if (!page) return { title: "Dépôt-vente indisponible", robots: { index: false } }
  const seo = buildPublicSeo({ garage: page.garage, pageTitle: "Dépôt-vente", description: page.description, canonicalPath: `${page.garage.homeHref}/depot-vente` })
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonicalPath } }
}
export default async function ConsignmentRoute({ params }: Props) {
  const page = await load(params)
  if (!page) notFound()
  return <PublicProgramPage page={page} />
}
