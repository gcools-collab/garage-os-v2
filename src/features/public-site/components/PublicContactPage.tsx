import type { PublicRequestFormViewModel, PublicRequestSource, PublicVehicleContextViewModel } from "@/features/public-leads"
import { PublicRequestForm } from "@/features/public-leads"
import type { PublicContactViewModel } from "../types"
import { PublicSiteLayout } from "./PublicSiteLayout"

export function PublicContactPage({ contact, request, unavailableRequest = false, missingVehicleRequest = false }: {
  readonly contact: PublicContactViewModel
  readonly request?: { readonly form: PublicRequestFormViewModel; readonly vehicleSlug: string | null; readonly vehicleContext: PublicVehicleContextViewModel | null; readonly source: PublicRequestSource } | null
  readonly unavailableRequest?: boolean
  readonly missingVehicleRequest?: boolean
}) {
  return <PublicSiteLayout garage={contact.garage}>
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-2 md:px-8">
      <section><h1 className="text-4xl font-semibold">{contact.title}</h1><p className="mt-4 text-[var(--live-muted-foreground)]">{contact.description}</p><div className="mt-8 space-y-3">{contact.phoneHref ? <a className="block underline" href={contact.phoneHref}>{contact.garage.phone}</a> : null}{contact.emailHref ? <a className="block underline" href={contact.emailHref}>{contact.garage.email}</a> : null}{contact.garage.address ? <p>{contact.garage.address}</p> : null}</div><div className="mt-8 flex aspect-video items-center justify-center rounded-2xl bg-[var(--live-muted)] text-[var(--live-muted-foreground)]">Carte — {contact.mapLabel}</div></section>
      <section className="rounded-2xl border border-[var(--live-border)] p-6"><h2 className="text-2xl font-semibold">Comment pouvons-nous vous aider ?</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{contact.journeys.map((journey) => <a key={journey.href} href={journey.href} className="rounded-xl border border-[var(--live-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]">{journey.label}</a>)}</div></section>
    </div>
    {request ? <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-5 md:px-8"><PublicRequestForm form={request.form} garageSlug={contact.garage.slug} vehicleSlug={request.vehicleSlug} vehicleContext={request.vehicleContext} source={request.source} publicPageUrl={`${contact.garage.homeHref}/contact`} /></div> : missingVehicleRequest ? <div role="status" className="mx-auto max-w-4xl px-5 pb-16 md:px-8"><p className="text-[var(--live-muted-foreground)]">Choisissez d’abord le véhicule que vous souhaitez essayer.</p><a href={`${contact.garage.homeHref}/stock`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--live-primary)] px-5 font-semibold text-[var(--live-primary-foreground)]">Voir les véhicules</a></div> : unavailableRequest ? <p role="status" className="mx-auto max-w-4xl px-5 pb-16 text-[var(--live-muted-foreground)] md:px-8">Cette demande n’est pas disponible pour ce garage. Vous pouvez choisir un autre moyen de contact.</p> : null}
  </PublicSiteLayout>
}
