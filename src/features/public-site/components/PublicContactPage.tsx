import type { PublicRequestFormViewModel, PublicRequestSource, PublicVehicleContextViewModel } from "@/features/public-leads"
import { PublicRequestForm } from "@/features/public-leads"
import type { PublicOfferPresentation } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import type { AvailabilitySlot } from "@/features/scheduling/types/scheduling"
import type { PublicContactViewModel } from "../types"
import { PublicSiteLayout } from "./PublicSiteLayout"

const projectLabels: Readonly<Record<string, string>> = {
  "engine-cleaning": "Décalaminage moteur",
  registration: "Carte grise",
  "test-drive": "Essai véhicule",
  "trade-in": "Reprise véhicule",
  consignment: "Dépôt-vente",
  buy: "Achat véhicule",
  rental: "Location",
  other: "Demande libre",
}

const projectSubtitles: Readonly<Partial<Record<string, string>>> = {
  "engine-cleaning": "Choisissez votre prestation et votre créneau.",
}

export function PublicContactPage({
  contact,
  request,
  selectedProject = null,
  unavailableRequest = false,
  missingVehicleRequest = false,
}: {
  readonly contact: PublicContactViewModel
  readonly selectedProject?: string | null
  readonly request?: {
    readonly form: PublicRequestFormViewModel
    readonly vehicleSlug: string | null
    readonly vehicleContext: PublicVehicleContextViewModel | null
    readonly source: PublicRequestSource
    readonly availability: readonly AvailabilitySlot[]
    readonly availabilityByOfferSlug?: Readonly<Record<string, readonly AvailabilitySlot[]>>
    readonly offers?: readonly PublicOfferPresentation[]
    readonly compactFormHeading?: boolean
  } | null
  readonly unavailableRequest?: boolean
  readonly missingVehicleRequest?: boolean
}) {
  const showProjectSelector = !selectedProject
  const changeRequestHref = `${contact.garage.homeHref}/contact`
  const selectedLabel = selectedProject ? projectLabels[selectedProject] ?? request?.form.title ?? "Demande" : null
  const mapHref = contact.garage.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.garage.address)}`
    : null

  return (
    <PublicSiteLayout garage={contact.garage}>
      {!showProjectSelector ? (
        <header className="mx-auto max-w-4xl px-5 pt-10 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">Demande sélectionnée</p>
              <h1 className="mt-2 text-3xl font-semibold">{selectedLabel}</h1>
              {selectedProject && projectSubtitles[selectedProject] ? (
                <p className="mt-2 text-[var(--live-muted-foreground)]">{projectSubtitles[selectedProject]}</p>
              ) : null}
            </div>
            <a href={changeRequestHref} className="text-sm font-medium underline underline-offset-4">Changer de demande</a>
          </div>
          {contact.garage.address ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--live-muted-foreground)]">
              <span>{contact.garage.name} — {contact.garage.address}</span>
              {mapHref ? <a href={mapHref} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Itinéraire</a> : null}
            </div>
          ) : null}
        </header>
      ) : (
        <div className="mx-auto max-w-4xl px-5 pt-10 md:px-8">
          <h1 className="text-4xl font-semibold">{contact.title}</h1>
          <p className="mt-4 text-[var(--live-muted-foreground)]">{contact.description}</p>
          {contact.phoneHref || contact.garage.address ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {contact.phoneHref ? <a href={contact.phoneHref} className="font-semibold hover:underline">{contact.garage.phone}</a> : null}
              {contact.garage.address ? <span className="text-[var(--live-muted-foreground)]">{contact.garage.address}</span> : null}
              {mapHref ? <a href={mapHref} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Itinéraire</a> : null}
            </div>
          ) : null}
        </div>
      )}

      {showProjectSelector ? (
        <section className="mx-auto mt-8 max-w-4xl px-5 md:px-8">
          <div className="rounded-2xl border border-[var(--live-border)] p-6">
            <h2 className="text-2xl font-semibold">Comment pouvons-nous vous aider ?</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {contact.journeys.map((journey) => (
                <a key={journey.href} href={journey.href} className="rounded-xl border border-[var(--live-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]">{journey.label}</a>
              ))}
            </div>
          </div>
        </section>
      ) : unavailableRequest ? (
        <p role="status" className="mx-auto mt-6 max-w-4xl px-5 text-[var(--live-muted-foreground)] md:px-8">
          Cette demande n’est pas disponible pour ce garage. Vous pouvez choisir un autre moyen de contact.
        </p>
      ) : missingVehicleRequest ? (
        <p role="status" className="mx-auto mt-6 max-w-4xl px-5 text-[var(--live-muted-foreground)] md:px-8">
          Choisissez d’abord le véhicule que vous souhaitez essayer.
        </p>
      ) : null}

      {request ? (
        <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
          <PublicRequestForm
            form={request.form}
            garageSlug={contact.garage.slug}
            vehicleSlug={request.vehicleSlug}
            vehicleContext={request.vehicleContext}
            source={request.source}
            publicPageUrl={`${contact.garage.homeHref}/contact`}
            availability={request.availability}
            availabilityByOfferSlug={request.availabilityByOfferSlug}
            offers={request.offers ?? []}
            compactFormHeading={request.compactFormHeading}
          />
        </div>
      ) : missingVehicleRequest && showProjectSelector ? (
        <div role="status" className="mx-auto max-w-4xl px-5 pb-16 md:px-8">
          <a href={`${contact.garage.homeHref}/stock`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--live-primary)] px-5 font-semibold text-[var(--live-primary-foreground)]">Voir les véhicules</a>
        </div>
      ) : null}
    </PublicSiteLayout>
  )
}
