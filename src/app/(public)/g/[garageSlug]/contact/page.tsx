import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  buildPublicContact,
  buildPublicSeo,
  getCachedPublicGarageContext,
  getPublicContactVehicle,
  PublicContactPage,
} from "@/features/public-site"
import {
  buildPublicRequestForm,
  buildPublicVehicleContext,
  getVehicleContextHeading,
  isPublicRequestAvailable,
  resolvePublicRequestType,
} from "@/features/public-leads"
import { getPublicAvailability } from "@/features/scheduling/repositories/scheduling-repository"
import { PublicBookingBuilder } from "@/features/scheduling/builders/scheduling-builders"
import {
  buildPublicOfferPresentations,
  getPublicServiceOfferOptions,
  getPublicServiceOffers,
} from "@/features/service-catalog"
import { getPublicRegistrationProcedures } from "@/features/registration"

type Props = {
  readonly params: Promise<{ readonly garageSlug: string }>
  readonly searchParams: Promise<{
    readonly project?: string | string[]
    readonly vehicle?: string | string[]
  }>
}

const schedulableTypes = new Set([
  "TEST_DRIVE",
  "ENGINE_CLEANING",
  "REGISTRATION",
  "CONSIGNMENT",
  "TRADE_IN",
])
const offerTypes = new Set(["ENGINE_CLEANING", "REGISTRATION"])

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { garageSlug } = await params
  const garage = await getCachedPublicGarageContext(garageSlug)
  if (!garage) return { title: "Contact indisponible", robots: { index: false } }
  const contact = buildPublicContact(garage)
  const seo = buildPublicSeo({
    garage: contact.garage,
    pageTitle: "Contact",
    description: contact.description,
    canonicalPath: `${contact.garage.homeHref}/contact`,
  })
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
  }
}

export default async function GarageContact({ params, searchParams }: Props) {
  const [{ garageSlug }, query] = await Promise.all([params, searchParams])
  const garage = await getCachedPublicGarageContext(garageSlug)
  if (!garage) notFound()

  const contact = buildPublicContact(garage)
  const selectedProject =
    typeof query.project === "string" ? query.project : null
  const type = resolvePublicRequestType(query.project)
  const serviceConfigurations = contact.garage.services.map((service, displayOrder) => ({
    serviceKey: service.id,
    status: "ENABLED" as const,
    publicTitle: null,
    publicDescription: null,
    publicCtaLabel: null,
    displayOrder,
  }))
  const available =
    type !== null && isPublicRequestAvailable(type, serviceConfigurations)
  const vehicleSlug = typeof query.vehicle === "string" ? query.vehicle : null
  const contextualRequest =
    type === "VEHICLE_INQUIRY" || type === "TEST_DRIVE" || type === "TRADE_IN"
  const vehicle =
    available && contextualRequest && vehicleSlug
      ? await getPublicContactVehicle(garage, vehicleSlug)
      : null
  const vehicleContext = vehicle ? buildPublicVehicleContext(vehicle) : null
  const contextHeading =
    type && vehicleContext ? getVehicleContextHeading(type, vehicleContext.title) : null
  const missingRequiredVehicle = type === "TEST_DRIVE" && !vehicle
  const schedulable = Boolean(type && schedulableTypes.has(type))

  const [offerRows, offerOptions, registrationProcedures] = await Promise.all([
    available && type && offerTypes.has(type)
      ? getPublicServiceOffers(contact.garage.slug, type)
      : Promise.resolve([]),
    available && type && offerTypes.has(type)
      ? getPublicServiceOfferOptions(contact.garage.slug, type)
      : Promise.resolve([]),
    available && type === "REGISTRATION"
      ? getPublicRegistrationProcedures(contact.garage.slug)
      : Promise.resolve([]),
  ])

  const offerPresentations =
    type && offerTypes.has(type)
      ? buildPublicOfferPresentations(offerRows, offerOptions)
      : []

  let availabilityByOfferSlug: Record<string, ReturnType<PublicBookingBuilder["build"]>> | undefined
  let availability: ReturnType<PublicBookingBuilder["build"]> = []

  if (available && !missingRequiredVehicle && schedulable && type) {
    if (offerPresentations.length > 0) {
      const entries = await Promise.all(
        offerPresentations.map(async (offer) => [
          offer.slug,
          new PublicBookingBuilder().build(
            await getPublicAvailability(contact.garage.slug, type, offer.slug),
          ),
        ] as const),
      )
      availabilityByOfferSlug = Object.fromEntries(entries)
      availability = availabilityByOfferSlug[offerPresentations[0]?.slug ?? ""] ?? []
    } else {
      availability = new PublicBookingBuilder().build(
        await getPublicAvailability(contact.garage.slug, type),
      )
    }
  }
  const baseForm = type ? buildPublicRequestForm(type, contextHeading) : null
  const configuredForm =
    baseForm && type === "REGISTRATION" && registrationProcedures.length > 0
      ? {
          ...baseForm,
          fields: baseForm.fields.map((field) =>
            field.name === "procedure"
              ? {
                  ...field,
                  options: registrationProcedures.map((procedure) => ({
                    value: procedure.procedure_type,
                    label: procedure.title,
                  })),
                }
              : field
          ),
        }
      : baseForm
  const form = configuredForm
  const registrationUnavailable =
    type === "REGISTRATION" &&
    offerPresentations.length === 0 &&
    registrationProcedures.length === 0
  const unavailableRequest = Boolean(
    type && (!available || registrationUnavailable)
  )

  return (
    <PublicContactPage
      contact={contact}
      selectedProject={selectedProject}
      missingVehicleRequest={Boolean(available && missingRequiredVehicle)}
      unavailableRequest={unavailableRequest}
      request={
        available && !registrationUnavailable && !missingRequiredVehicle && form
          ? {
              form,
              vehicleSlug: vehicle?.slug ?? null,
              vehicleContext,
              availability,
              availabilityByOfferSlug,
              offers: offerPresentations,
              compactFormHeading: selectedProject === "engine-cleaning",
              source: vehicle
                ? "VEHICLE_DETAIL"
                : type === "CONSIGNMENT"
                  ? "CONSIGNMENT_PAGE"
                  : type === "GENERAL_CONTACT"
                    ? "CONTACT_CENTER"
                    : "SERVICE_PAGE",
            }
          : null
      }
    />
  )
}
