import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { buildPublicContact, buildPublicSeo, getPublicSiteRecord, PublicContactPage } from "@/features/public-site"

type Props = { readonly params: Promise<{ readonly garageSlug: string }> }
async function load(params: Props["params"]) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  return record ? buildPublicContact(record.garage) : null
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const contact = await load(params)
  if (!contact) return { title: "Contact indisponible", robots: { index: false } }
  const seo = buildPublicSeo({ garage: contact.garage, pageTitle: "Contact", description: contact.description, canonicalPath: `${contact.garage.homeHref}/contact` })
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonicalPath } }
}
export default async function GarageContact({ params }: Props) {
  const contact = await load(params)
  if (!contact) notFound()
  return <PublicContactPage contact={contact} />
}
