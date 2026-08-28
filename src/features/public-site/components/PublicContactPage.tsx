import type { PublicRequestFormViewModel, PublicRequestSource, PublicVehicleContextViewModel } from "@/features/public-leads"
import { PublicRequestForm } from "@/features/public-leads"
import type { AvailabilitySlot } from "@/features/scheduling/types/scheduling"
import type { PublicContactViewModel } from "../types"
import { PublicSiteLayout } from "./PublicSiteLayout"

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
  } | null
  readonly unavailableRequest?: boolean
  readonly missingVehicleRequest?: boolean
}) {
  const showProjectSelector = !selectedProject
  const changeRequestHref = `${contact.garage.homeHref}/contact`

  return (
    <PublicSiteLayout garage={contact.garage}>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-2 md:px-8">
        <section>
          <h1 className="text-4xl font-semibold">{contact.title}</h1>
          <p className="mt-4 text-[var(--live-muted-foreground)]">{contact.description}</p>
          <div className="mt-8 space-y-3">
            {contact.phoneHref ? (
              <a className="block underline" href={contact.phoneHref}>
                {contact.garage.phone}
              </a>
            ) : null}
            {contact.emailHref ? (
              <a className="block underline" href={contact.emailHref}>
                {contact.garage.email}
              </a>
            ) : null}
            {contact.garage.address ? <p>{contact.garage.address}</p> : null}
          </div>
          <div className="mt-8 flex aspect-video items-center justify-center rounded-2xl bg-[var(--live-muted)] text-[var(--live-muted-foreground)]">
            Carte — {contact.mapLabel}
          </div>
        </section>
        {showProjectSelector ? (
          <section className="rounded-2xl border border-[var(--live-border)] p-6">
            <h2 className="text-2xl font-semibold">Comment pouvons-nous vous aider ?</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {contact.journeys.map((journey) => (
                <a
                  key={journey.href}
                  href={journey.href}
                  className="rounded-xl border border-[var(--live-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]"
                >
                  {journey.label}
                </a>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-[var(--live-border)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">
                  Demande sélectionnée
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {request?.form.title ?? "Demande indisponible"}
                </h2>
              </div>
              <a
                href={changeRequestHref}
                className="text-sm font-medium underline underline-offset-4"
              >
                Changer de demande
              </a>
            </div>
            {request ? (
              <p className="mt-4 text-[var(--live-muted-foreground)]">
                Complétez le formulaire ci-dessous pour transmettre votre demande au garage.
              </p>
            ) : unavailableRequest ? (
              <p role="status" className="mt-4 text-[var(--live-muted-foreground)]">
                Cette demande n’est pas disponible pour ce garage. Vous pouvez choisir un autre moyen de contact.
              </p>
            ) : missingVehicleRequest ? (
              <p role="status" className="mt-4 text-[var(--live-muted-foreground)]">
                Choisissez d’abord le véhicule que vous souhaitez essayer.
              </p>
            ) : null}
          </section>
        )}
      </div>
      {request ? (
        <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-5 md:px-8">
          <PublicRequestForm
            form={request.form}
            garageSlug={contact.garage.slug}
            vehicleSlug={request.vehicleSlug}
            vehicleContext={request.vehicleContext}
            source={request.source}
            publicPageUrl={`${contact.garage.homeHref}/contact`}
            availability={request.availability}
          />
        </div>
      ) : missingVehicleRequest && showProjectSelector ? (
        <div role="status" className="mx-auto max-w-4xl px-5 pb-16 md:px-8">
          <p className="text-[var(--live-muted-foreground)]">
            Choisissez d’abord le véhicule que vous souhaitez essayer.
          </p>
          <a
            href={`${contact.garage.homeHref}/stock`}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--live-primary)] px-5 font-semibold text-[var(--live-primary-foreground)]"
          >
            Voir les véhicules
          </a>
        </div>
      ) : unavailableRequest && showProjectSelector ? (
        <p
          role="status"
          className="mx-auto max-w-4xl px-5 pb-16 text-[var(--live-muted-foreground)] md:px-8"
        >
          Cette demande n’est pas disponible pour ce garage. Vous pouvez choisir un autre moyen de contact.
        </p>
      ) : null}
    </PublicSiteLayout>
  )
}
