import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { buildPublicProgram, buildPublicSeo, getPublicSiteRecord, PublicProgramPage } from "@/features/public-site"

type Props = { readonly params: Promise<{ readonly garageSlug: string }> }
async function load(params: Props["params"]) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  return record ? buildPublicProgram(record.garage, "RENTAL") : null
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load(params)
  if (!page) return { title: "Location indisponible", robots: { index: false } }
  const seo = buildPublicSeo({ garage: page.garage, pageTitle: "Location", description: page.description, canonicalPath: `${page.garage.homeHref}/location` })
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonicalPath } }
}
export default async function RentalRoute({ params }: Props) {
  const page = await load(params)
  if (!page) notFound()
  return <PublicProgramPage page={page} />
}
