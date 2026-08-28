import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import {
  AppointmentDetailBuilder,
  appointmentStatusLabels,
  getAppointment,
  getAppointmentEvents,
  rescheduleAppointment,
  updateAppointmentStatus,
  type AppointmentStatus,
} from "@/features/scheduling"
import { buildCommercialSnapshotViewModel } from "@/features/service-catalog"
import { getRegistrationCaseLink } from "@/features/registration/repositories/registration-repository"
import { getAppointmentPayments } from "@/features/payments/repositories/payment-repository"
import { getActiveGarageSession } from "@/features/tenant"
import { Badge } from "@/components/ui/badge"

export default async function AppointmentPage({
  params,
}: {
  readonly params: Promise<{ readonly appointmentId: string }>
}) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const { appointmentId } = await params
  const [row, events, registrationLink, payments] = await Promise.all([
    getAppointment(session.garageId, appointmentId),
    getAppointmentEvents(session.garageId, appointmentId),
    getRegistrationCaseLink(session.garageId, { appointmentId }),
    getAppointmentPayments(session.garageId, appointmentId),
  ])
  if (!row) notFound()

  const paid = payments.find((payment) => payment.status === "PAID")
  const paymentStatusLabel = paid
    ? "Paiement reçu"
    : payments.length
      ? `Paiement ${payments[0].status.toLowerCase()}`
      : null

  const detail = new AppointmentDetailBuilder().build(row, {
    registrationCaseId: registrationLink?.id ?? null,
    paymentStatusLabel,
  })

  const snapshot = buildCommercialSnapshotViewModel(
    (row as unknown as { commercial_snapshot?: Readonly<Record<string, unknown>> | null }).commercial_snapshot,
  )

  const actions: AppointmentStatus[] = row.is_historical
    ? []
    : row.status === "PENDING" || row.status === "AWAITING_PAYMENT"
      ? ["CONFIRMED", "CANCELLED"]
      : row.status === "CONFIRMED"
        ? ["COMPLETED", "CANCELLED", "NO_SHOW"]
        : []

  return (
    <main className="space-y-6">
      <header>
        <Link href="/appointments" className="text-sm underline">Retour à l&apos;agenda</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">{detail.typeLabel}</h1>
          {detail.isHistorical ? <Badge variant="secondary">Historique importé</Badge> : null}
        </div>
        <p className="mt-2 text-muted-foreground">
          {detail.dateLabel} · {detail.timeLabel} · {detail.durationMinutes} min · {detail.statusLabel} · {detail.sourceLabel}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Client</h2>
          <p className="mt-3">{detail.customerName}</p>
          <p>{detail.phone ?? "Téléphone non renseigné"}</p>
          <p className="break-all">{detail.email ?? "E-mail non renseigné"}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {detail.customerHref ? <Link href={detail.customerHref} className="underline">Fiche client</Link> : null}
            {detail.leadHref ? <Link href={detail.leadHref} className="underline">Demande commerciale</Link> : null}
          </div>
        </section>

        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Suivi</h2>
          <p className="mt-3">{detail.paymentLabel}</p>
          {detail.paymentStatusLabel ? <p className="text-sm text-muted-foreground">{detail.paymentStatusLabel}</p> : null}
          {detail.registrationHref ? (
            <Link href={detail.registrationHref} className="mt-3 inline-block text-sm underline">
              Dossier carte grise {registrationLink?.public_reference ?? ""}
            </Link>
          ) : row.customer_id && row.type === "REGISTRATION" && !row.is_historical ? (
            <Link href={`/registration/new?customerId=${row.customer_id}&appointmentId=${row.id}`} className="mt-3 inline-block text-sm underline">
              Créer le dossier carte grise
            </Link>
          ) : null}
        </section>
      </div>

      {detail.notes ? (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm">{detail.notes}</p>
        </section>
      ) : null}

      {snapshot ? (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Prestation commerciale</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-sm text-muted-foreground">Prestation</dt><dd>{snapshot.offerName}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Tarification</dt><dd>{snapshot.pricingLabel}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Total</dt><dd>{snapshot.totalLabel}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Montant dû maintenant</dt><dd>{snapshot.dueNowLabel}</dd></div>
          </dl>
        </section>
      ) : null}

      {!row.is_historical ? (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Déplacer le rendez-vous</h2>
          <p className="mt-1 text-sm text-muted-foreground">Le créneau est contrôlé avant modification.</p>
          <form action={rescheduleAppointment} className="mt-4 flex flex-wrap gap-3">
            <input type="hidden" name="appointmentId" value={row.id} />
            <input type="datetime-local" name="startsAt" required className="min-h-11 rounded-md border px-3 py-2" />
            <button className="min-h-11 rounded-md border px-4 py-2">Vérifier et déplacer</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">Historique</h2>
        {events.length ? (
          <ol className="mt-4 space-y-2">
            {events.map((event) => (
              <li key={String(event.id)} className="text-sm">
                <strong>{String(event.event_type)}</strong>
                {" · "}
                {new Date(String(event.created_at)).toLocaleString("fr-FR")}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-muted-foreground">Aucun événement.</p>
        )}
      </section>

      {actions.length ? (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="text-xl font-semibold">Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {actions.map((status) => (
              <form key={status} action={updateAppointmentStatus}>
                <input type="hidden" name="appointmentId" value={row.id} />
                <input type="hidden" name="status" value={status} />
                <button className="min-h-11 rounded-md border px-4 py-2">{appointmentStatusLabels[status]}</button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
