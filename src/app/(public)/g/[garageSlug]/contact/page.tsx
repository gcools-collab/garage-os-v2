import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { buildPublicContact, buildPublicSeo, getPublicSiteRecord, PublicContactPage } from "@/features/public-site"
import { buildPublicRequestForm, buildPublicVehicleContext, getVehicleContextHeading, isPublicRequestAvailable, resolvePublicRequestType } from "@/features/public-leads"

type Props = { readonly params: Promise<{ readonly garageSlug: string }>; readonly searchParams: Promise<{ readonly project?: string | string[]; readonly vehicle?: string | string[] }> }
async function load(params: Props["params"]) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  return record ? { contact: buildPublicContact(record.garage), record } : null
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await load(params)
  if (!loaded) return { title: "Contact indisponible", robots: { index: false } }
  const { contact } = loaded
  const seo = buildPublicSeo({ garage: contact.garage, pageTitle: "Contact", description: contact.description, canonicalPath: `${contact.garage.homeHref}/contact` })
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonicalPath } }
}
export default async function GarageContact({ params, searchParams }: Props) {
  const loaded = await load(params)
  if (!loaded) notFound()
  const { contact, record } = loaded
  const query = await searchParams
  const type = resolvePublicRequestType(query.project)
  const available = type && isPublicRequestAvailable(type, contact.garage.services.map((service, displayOrder) => ({ serviceKey: service.id, status: "ENABLED" as const, publicTitle: null, publicDescription: null, publicCtaLabel: null, displayOrder })))
  const vehicleSlug = typeof query.vehicle === "string" ? query.vehicle : null
  const contextualRequest = type === "VEHICLE_INQUIRY" || type === "TEST_DRIVE" || type === "TRADE_IN"
  const vehicle = contextualRequest && vehicleSlug ? record.vehicles.find((candidate) => candidate.slug === vehicleSlug) ?? null : null
  const vehicleContext = vehicle ? buildPublicVehicleContext(vehicle) : null
  const contextHeading = type && vehicleContext ? getVehicleContextHeading(type, vehicleContext.title) : null
  const missingRequiredVehicle = type === "TEST_DRIVE" && !vehicle
  return <PublicContactPage contact={contact} missingVehicleRequest={Boolean(available && missingRequiredVehicle)} unavailableRequest={Boolean(type && !available)} request={available && !missingRequiredVehicle ? { form: buildPublicRequestForm(type, contextHeading), vehicleSlug: vehicle?.slug ?? null, vehicleContext, source: vehicle ? "VEHICLE_DETAIL" : type === "CONSIGNMENT" ? "CONSIGNMENT_PAGE" : type === "GENERAL_CONTACT" ? "CONTACT_CENTER" : "SERVICE_PAGE" } : null} />
}
