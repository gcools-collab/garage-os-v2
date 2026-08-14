import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { buildPublicContact, buildPublicSeo, getPublicSiteRecord, PublicContactPage } from "@/features/public-site"
import { buildPublicRequestForm, isPublicRequestAvailable, resolvePublicRequestType } from "@/features/public-leads"

type Props = { readonly params: Promise<{ readonly garageSlug: string }>; readonly searchParams: Promise<{ readonly project?: string | string[]; readonly vehicle?: string | string[] }> }
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
export default async function GarageContact({ params, searchParams }: Props) {
  const contact = await load(params)
  if (!contact) notFound()
  const query = await searchParams
  const type = resolvePublicRequestType(query.project)
  const available = type && isPublicRequestAvailable(type, contact.garage.services.map((service, displayOrder) => ({ serviceKey: service.id, status: "ENABLED" as const, publicTitle: null, publicDescription: null, publicCtaLabel: null, displayOrder })))
  const vehicleSlug = typeof query.vehicle === "string" ? query.vehicle : null
  const vehicleRequest = type === "VEHICLE_INQUIRY" || type === "TEST_DRIVE"
  return <PublicContactPage contact={contact} unavailableRequest={Boolean(type && !available)} request={available ? { form: buildPublicRequestForm(type), vehicleSlug: vehicleRequest ? vehicleSlug : null, source: vehicleRequest && vehicleSlug ? "VEHICLE_DETAIL" : type === "CONSIGNMENT" ? "CONSIGNMENT_PAGE" : type === "GENERAL_CONTACT" ? "CONTACT_CENTER" : "SERVICE_PAGE" } : null} />
}
