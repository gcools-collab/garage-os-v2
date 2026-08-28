"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import type { CustomerDetailViewModel, CustomerListItemViewModel } from "../builders/customer-view-models"
import { filterTimelineEvents, formatTimelineWhen } from "../engine/customer-timeline-engine"
import type { TimelineCategory } from "../types/customer-timeline"

export function CustomerList({ customers }: { readonly customers: readonly CustomerListItemViewModel[] }) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
        Aucun client ne correspond à ces critères.
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {customers.map((customer) => (
        <article
          key={customer.id}
          className="grid gap-4 rounded-xl border bg-white p-4 sm:p-5 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">{customer.name}</h2>
              <Badge variant="outline">{customer.sourceLabel}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{customer.emailLabel} · {customer.phoneLabel}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {customer.vehicleCountLabel} · Dernière interaction : {customer.lastInteractionLabel}
              {customer.nextAppointmentLabel ? ` · Prochain RDV : ${customer.nextAppointmentLabel}` : ""}
            </p>
          </div>
          <Link
            href={customer.href}
            className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Ouvrir la fiche
          </Link>
        </article>
      ))}
    </div>
  )
}

const timelineCategoryLabels = {
  ALL: "Tout",
  CUSTOMER: "Client",
  COMMERCIAL: "Commercial",
  APPOINTMENT: "Rendez-vous",
  PAYMENT: "Paiements",
  BILLING: "Facturation",
  REGISTRATION: "Carte grise",
  VEHICLE: "Véhicules",
} as const

export function Customer360View({ view }: { readonly view: CustomerDetailViewModel }) {
  const [category, setCategory] = useState<TimelineCategory>("ALL")
  const filteredTimeline = useMemo(
    () => filterTimelineEvents(view.timeline, category),
    [view.timeline, category],
  )

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">Fiche client</p>
            <h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">{view.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Client depuis le {view.createdAtLabel} · {view.sourceLabel}
            </p>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">E-mail</dt><dd className="break-all">{view.email ?? "Non renseigné"}</dd></div>
              <div><dt className="text-muted-foreground">Téléphone</dt><dd>{view.phone ?? "Non renseigné"}</dd></div>
              {view.addressLabel ? <div className="sm:col-span-2"><dt className="text-muted-foreground">Adresse</dt><dd>{view.addressLabel}</dd></div> : null}
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            {view.quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noreferrer" : undefined}
                className="inline-flex min-h-11 items-center rounded-md border bg-background px-4 text-sm font-medium"
              >
                {action.label}
              </Link>
            ))}
            <Link href={`/customers/${view.id}/edit`} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium">
              Modifier
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Rendez-vous" value={String(view.metrics.appointmentCount)} detail={`${view.metrics.upcomingAppointmentCount} à venir · ${view.metrics.completedAppointmentCount} terminés`} />
        <MetricCard label="Demandes" value={String(view.metrics.leadCount)} detail="Historique commercial" />
        <MetricCard label="Véhicules connus" value={String(view.metrics.vehicleCount)} detail="Parc client" />
        <MetricCard
          label="Facturé"
          value={new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(view.metrics.invoicedCents / 100)}
          detail={`Reste dû ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(view.metrics.outstandingCents / 100)}`}
        />
        <MetricCard
          label="Encaissements"
          value={new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format((view.metrics.historicalPaidCents + view.metrics.livePaidCents) / 100)}
          detail="Historique importé + Garage OS"
        />
      </section>

      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Historique unifié</h2>
            <p className="text-sm text-muted-foreground">Toutes les interactions liées à ce client, du plus récent au plus ancien.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(timelineCategoryLabels) as TimelineCategory[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={category === key}
                onClick={() => setCategory(key)}
                className="min-h-10 rounded-full border px-3 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {timelineCategoryLabels[key]}
              </button>
            ))}
          </div>
        </header>
        {filteredTimeline.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun événement dans cette catégorie pour le moment.
          </p>
        ) : (
          <ol className="space-y-3">
            {filteredTimeline.map((event) => (
              <li key={event.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{event.typeLabel}</p>
                      {event.isImported ? <Badge variant="secondary">Historique importé</Badge> : null}
                    </div>
                    <p className="mt-1 break-words text-sm">{event.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{event.domainLabel} · {formatTimelineWhen(event.occurredAt)}</p>
                  </div>
                  <div className="text-right text-sm">
                    {event.amountLabel ? <p className="font-medium">{event.amountLabel}</p> : null}
                    {event.statusLabel ? <p className="text-muted-foreground">{event.statusLabel}</p> : null}
                    {event.href ? <Link href={event.href} className="mt-2 inline-block underline">Voir le détail</Link> : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Véhicules du client" empty={view.vehicles.length === 0} emptyLabel="Aucun véhicule associé pour le moment.">
          <ul className="space-y-3">
            {view.vehicles.map((vehicle) => (
              <li key={vehicle.id} className="rounded-lg border p-4">
                <p className="font-medium">{vehicle.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{vehicle.registration ?? "Immatriculation inconnue"}{vehicle.vin ? ` · VIN ${vehicle.vin}` : ""}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">{vehicle.sourceLabel}</Badge>
                  {vehicle.isStockLinked && vehicle.stockHref ? <Link href={vehicle.stockHref} className="underline">Voir le véhicule en stock</Link> : <span className="text-muted-foreground">Hors stock Garage OS</span>}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Rendez-vous" empty={view.appointments.length === 0} emptyLabel="Aucun rendez-vous lié à ce client.">
          <ul className="space-y-3">
            {view.appointments.map((appointment) => (
              <li key={appointment.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{appointment.typeLabel}</p>
                  {appointment.isHistorical ? <Badge variant="secondary">Historique importé</Badge> : null}
                  {appointment.isUpcoming ? <Badge>À venir</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{appointment.whenLabel} · {appointment.statusLabel}</p>
                {appointment.href ? <Link href={appointment.href} className="mt-2 inline-block text-sm underline">Ouvrir le rendez-vous</Link> : null}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Demandes et commercial" empty={view.leads.length === 0} emptyLabel="Aucune demande commerciale liée.">
          <ul className="space-y-3">
            {view.leads.map((lead) => (
              <li key={lead.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{lead.typeLabel}</p>
                  {lead.isImported ? <Badge variant="secondary">Historique importé</Badge> : null}
                  <Badge variant="outline">{lead.statusLabel}</Badge>
                </div>
                {lead.messagePreview ? <p className="mt-2 break-words text-sm">{lead.messagePreview}</p> : null}
                <Link href={lead.href} className="mt-2 inline-block text-sm underline">Ouvrir la demande</Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Carte grise" empty={view.registrationCases.length === 0} emptyLabel="Aucun dossier carte grise pour ce client.">
          <ul className="space-y-3">
            {view.registrationCases.map((item) => (
              <li key={item.id} className="rounded-lg border p-4">
                <p className="font-medium">{item.reference}</p>
                <p className="mt-1 text-sm">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.vehicleLabel} · {item.statusLabel}</p>
                <Link href={item.href} className="mt-2 inline-block text-sm underline">Ouvrir le dossier</Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Facturation" empty={view.billingDocuments.length === 0} emptyLabel="Aucun devis, facture ou avoir pour ce client.">
          <ul className="space-y-3">
            {view.billingDocuments.map((item) => (
              <li key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.typeLabel} · {item.numberLabel}</p>
                  <Badge variant="outline">{item.statusLabel}</Badge>
                </div>
                <p className="mt-2 font-semibold">{item.amountLabel}{item.outstandingLabel ? ` · Reste ${item.outstandingLabel}` : ""}</p>
                <Link href={item.href} className="mt-2 inline-block text-sm underline">Ouvrir le document</Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Historique financier" empty={view.financialItems.length === 0} emptyLabel="Aucun paiement enregistré pour ce client." className="xl:col-span-2">
          <ul className="space-y-3">
            {view.financialItems.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.label}</p>
                    <Badge variant={item.kind === "historical" ? "secondary" : item.kind === "billing" ? "outline" : "outline"}>
                      {item.kind === "historical" ? "Historique importé" : item.kind === "billing" ? "Facturation" : "Garage OS"}
                    </Badge>
                    {!item.countsAsRevenue ? <Badge variant="outline">Non comptabilisé</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.whenLabel} · {item.statusLabel}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-semibold">{item.amountLabel}</p>
                  {item.href ? <Link href={item.href} className="text-sm underline">Voir le détail</Link> : null}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {view.notes ? (
        <section className="rounded-xl border bg-white p-4 sm:p-6">
          <h2 className="text-xl font-semibold">Notes internes</h2>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm">{view.notes}</p>
        </section>
      ) : null}
    </div>
  )
}

function MetricCard({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail: string }) {
  return (
    <article className="rounded-xl border bg-white p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  )
}

function SectionCard({
  title,
  empty,
  emptyLabel,
  className,
  children,
}: {
  readonly title: string
  readonly empty: boolean
  readonly emptyLabel: string
  readonly className?: string
  readonly children: ReactNode
}) {
  return (
    <section className={`rounded-xl border bg-white p-4 sm:p-6 ${className ?? ""}`}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {empty ? <p className="mt-4 text-sm text-muted-foreground">{emptyLabel}</p> : <div className="mt-4">{children}</div>}
    </section>
  )
}
