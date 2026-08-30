import { Mail, MapPin } from "lucide-react"
import type { PublicRequestFormViewModel, PublicRequestSource, PublicVehicleContextViewModel } from "@/features/public-leads"
import { PublicRequestForm } from "@/features/public-leads"
import type { PublicOfferPresentation } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import type { AvailabilitySlot } from "@/features/scheduling/types/scheduling"
import { publicMapsDirectionsHref } from "../builders"
import type { PublicContactViewModel } from "../types"
import { PublicCallButton } from "./PublicCallButton"
import { PublicSiteLayout } from "./PublicSiteLayout"
import { PublicSocialIcon } from "./PublicSocialIcon"

const projectLabels: Readonly<Record<string, string>> = {
  "engine-cleaning": "Décalaminage moteur",
  registration: "Démarches d’immatriculation",
  "test-drive": "Demander un essai",
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
  const mapHref = contact.garage.address ? publicMapsDirectionsHref(contact.garage.address) : null

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
              {selectedProject === "test-drive" ? (
                <p className="mt-2 text-sm text-[var(--live-muted-foreground)]">
                  Cette demande doit être confirmée par l’équipe. Le créneau n’est jamais définitivement réservé tant que le garage ne vous a pas recontacté.
                </p>
              ) : null}
            </div>
            <a href={changeRequestHref} className="text-sm font-medium underline underline-offset-4">Changer de demande</a>
          </div>
          {contact.garage.address || contact.phoneHref ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {contact.phoneHref ? <PublicCallButton href={contact.phoneHref} className="inline-flex min-h-10 items-center gap-2 font-semibold hover:underline" /> : null}
              {mapHref ? (
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium underline underline-offset-4">
                  <MapPin className="size-4 shrink-0" aria-hidden="true" />
                  Obtenir mon itinéraire
                </a>
              ) : null}
            </div>
          ) : null}
        </header>
      ) : (
        <div className="mx-auto max-w-4xl px-5 pt-10 md:px-8">
          <h1 className="text-4xl font-semibold">{contact.title}</h1>
          <p className="mt-4 text-[var(--live-muted-foreground)]">{contact.description}</p>
          <div className="mt-6 grid gap-3 text-sm">
            {contact.phoneHref ? (
              <PublicCallButton
                href={contact.phoneHref}
                className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-[var(--live-primary)] px-4 font-semibold text-[var(--live-primary-foreground)]"
              />
            ) : null}
            {contact.emailHref ? (
              <a href={contact.emailHref} className="inline-flex items-center gap-2 font-medium hover:underline">
                <Mail className="size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                {contact.garage.email}
              </a>
            ) : null}
            {mapHref ? (
              <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 font-medium hover:underline">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                <span>
                  <span className="block text-[var(--live-muted-foreground)]">{contact.garage.address}</span>
                  Calculer mon temps de route
                </span>
              </a>
            ) : contact.garage.address ? (
              <p className="inline-flex items-center gap-2 text-[var(--live-muted-foreground)]">
                <MapPin className="size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                {contact.garage.address}
              </p>
            ) : null}
            {contact.garage.socialLinks.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {contact.garage.socialLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--live-border-strong)] px-3 font-medium"
                    >
                      <PublicSocialIcon label={link.label} />
                      {link.label}
                    </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showProjectSelector ? (
        <section className="mx-auto mt-8 max-w-4xl px-5 pb-20 md:px-8 md:pb-24">
          <div className="rounded-2xl border border-[var(--live-border)] p-6 md:p-8">
            <h2 className="text-2xl font-semibold">Comment pouvons-nous vous aider ?</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
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
