import { appointmentStatusLabels, appointmentTypeLabels } from "@/features/scheduling/builders/scheduling-builders"
import { leadStatusLabels, leadTypeLabels } from "@/features/leads/builders/lead-view-models"
import { registrationStatusLabels } from "@/features/registration/types/registration"
import { documentTypeLabels, statusLabelFor } from "@/features/billing/builders/billing-view-models"
import { computeRemainingCents } from "@/features/billing/engines/money-engine"
import { formatCustomerName } from "../normalization"
import type { Customer360Bundle } from "../repositories/customer-repository"
import type { CustomerTimelineEvent, CustomerSummaryMetrics, TimelineCategory } from "../types/customer-timeline"
import { customerSourceLabels, isImportedCustomerSource } from "../types/customer"

const money = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100)

const when = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "Date inconnue"

export function isHistoricalPaymentSuccessful(sourceStatus: string): boolean {
  const status = sourceStatus.toLowerCase()
  if (status.includes("refund") || status.includes("cancel") || status.includes("failed") || status.includes("void") || status.includes("denied")) {
    return false
  }
  return status.includes("completed") || status.includes("paid") || status.includes("processing") || status.includes("success")
}

function sortKey(iso: string, id: string): string {
  return `${iso}::${id}`
}

export function buildCustomerTimeline(bundle: Customer360Bundle): readonly CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = []
  const { customer } = bundle

  events.push({
    id: `customer-created-${customer.id}`,
    category: "CUSTOMER",
    typeLabel: isImportedCustomerSource(customer.source) ? "Client importé" : "Client créé",
    occurredAt: customer.created_at,
    description: formatCustomerName(customer.first_name, customer.last_name),
    domainLabel: customerSourceLabels[customer.source],
    amountLabel: null,
    statusLabel: null,
    href: null,
    isImported: isImportedCustomerSource(customer.source),
    sortKey: sortKey(customer.created_at, customer.id),
  })

  for (const lead of bundle.leads) {
    const imported = Boolean((lead as { legacy_source?: string | null }).legacy_source)
    events.push({
      id: `lead-created-${lead.id}`,
      category: "COMMERCIAL",
      typeLabel: imported ? "Demande importée" : "Demande commerciale",
      occurredAt: lead.created_at,
      description: `${leadTypeLabels[lead.type]} — ${lead.customer_name}`,
      domainLabel: imported ? "Historique importé" : "Demandes clients",
      amountLabel: null,
      statusLabel: leadStatusLabels[lead.status],
      href: `/leads/${lead.id}`,
      isImported: imported,
      sortKey: sortKey(lead.created_at, lead.id),
    })
  }

  for (const event of bundle.leadEvents) {
    if (event.event_type !== "STATUS_CHANGED" || !event.to_status) continue
    events.push({
      id: `lead-event-${event.id}`,
      category: "COMMERCIAL",
      typeLabel: "Statut demande modifié",
      occurredAt: event.created_at,
      description: event.from_status ? `${leadStatusLabels[event.from_status]} → ${leadStatusLabels[event.to_status]}` : leadStatusLabels[event.to_status],
      domainLabel: "Demandes clients",
      amountLabel: null,
      statusLabel: leadStatusLabels[event.to_status],
      href: `/leads/${event.lead_id}`,
      isImported: false,
      sortKey: sortKey(event.created_at, event.id),
    })
  }

  for (const note of bundle.leadNotes) {
    const preview = note.content.trim().replace(/\s+/g, " ").slice(0, 160)
    events.push({
      id: `lead-note-${note.id}`,
      category: "COMMERCIAL",
      typeLabel: "Note commerciale",
      occurredAt: note.created_at,
      description: preview.length < note.content.trim().length ? `${preview}…` : preview,
      domainLabel: "Demandes clients",
      amountLabel: null,
      statusLabel: null,
      href: `/leads/${note.lead_id}`,
      isImported: false,
      sortKey: sortKey(note.created_at, note.id),
    })
  }

  for (const task of bundle.commercialTasks) {
    events.push({
      id: `task-${task.id}`,
      category: "COMMERCIAL",
      typeLabel: "Tâche commerciale",
      occurredAt: task.created_at,
      description: task.title,
      domainLabel: "Commercial",
      amountLabel: null,
      statusLabel: task.status,
      href: task.lead_id ? `/leads/${task.lead_id}` : null,
      isImported: false,
      sortKey: sortKey(task.created_at, task.id),
    })
  }

  for (const appointment of bundle.appointments) {
    const imported = appointment.is_historical || Boolean((appointment as { legacy_source?: string }).legacy_source)
    events.push({
      id: `appointment-${appointment.id}`,
      category: "APPOINTMENT",
      typeLabel: imported ? "Rendez-vous historique" : "Rendez-vous",
      occurredAt: appointment.starts_at,
      description: `${appointmentTypeLabels[appointment.type]} — ${appointment.customer_name ?? "Client"}`,
      domainLabel: imported ? "Historique importé" : "Agenda",
      amountLabel: null,
      statusLabel: appointmentStatusLabels[appointment.status],
      href: imported ? null : `/appointments/${appointment.id}`,
      isImported: imported,
      sortKey: sortKey(appointment.starts_at, appointment.id),
    })
  }

  for (const event of bundle.appointmentEvents) {
    events.push({
      id: `appointment-event-${event.id}`,
      category: "APPOINTMENT",
      typeLabel: "Évolution rendez-vous",
      occurredAt: event.created_at,
      description: event.new_status ? appointmentStatusLabels[event.new_status as keyof typeof appointmentStatusLabels] ?? event.new_status : String(event.event_type),
      domainLabel: "Agenda",
      amountLabel: null,
      statusLabel: event.new_status,
      href: `/appointments/${event.appointment_id}`,
      isImported: false,
      sortKey: sortKey(event.created_at, event.id),
    })
  }

  for (const item of bundle.registrationCases) {
    events.push({
      id: `registration-${item.id}`,
      category: "REGISTRATION",
      typeLabel: "Dossier carte grise",
      occurredAt: item.created_at,
      description: `${item.procedure_title} (${item.public_reference})`,
      domainLabel: "Carte grise",
      amountLabel: null,
      statusLabel: registrationStatusLabels[item.status as keyof typeof registrationStatusLabels] ?? item.status,
      href: `/registration/${item.id}`,
      isImported: false,
      sortKey: sortKey(item.created_at, item.id),
    })
  }

  for (const event of bundle.registrationEvents) {
    events.push({
      id: `registration-event-${event.id}`,
      category: "REGISTRATION",
      typeLabel: "Évolution dossier carte grise",
      occurredAt: event.created_at,
      description: event.new_status ? registrationStatusLabels[event.new_status as keyof typeof registrationStatusLabels] ?? event.new_status : String(event.event_type),
      domainLabel: "Carte grise",
      amountLabel: null,
      statusLabel: event.new_status,
      href: `/registration/${event.case_id}`,
      isImported: false,
      sortKey: sortKey(event.created_at, event.id),
    })
  }

  for (const payment of bundle.historicalPayments) {
    const successful = isHistoricalPaymentSuccessful(payment.source_status)
    events.push({
      id: `historical-payment-${payment.id}`,
      category: "PAYMENT",
      typeLabel: successful ? "Paiement historique" : "Paiement historique (non comptabilisé)",
      occurredAt: payment.occurred_at ?? payment.created_at,
      description: `Commande ${payment.external_order_id}`,
      domainLabel: "Historique importé",
      amountLabel: money(payment.amount_cents, payment.currency),
      statusLabel: payment.source_status,
      href: null,
      isImported: true,
      sortKey: sortKey(payment.occurred_at ?? payment.created_at, payment.id),
    })
  }

  for (const payment of bundle.livePayments) {
    events.push({
      id: `live-payment-${payment.id}`,
      category: "PAYMENT",
      typeLabel: "Paiement Garage OS",
      occurredAt: payment.paidAt ?? payment.createdAt,
      description: "Paiement lié à un rendez-vous",
      domainLabel: "Garage OS",
      amountLabel: money(payment.amountCents, payment.currency),
      statusLabel: payment.status,
      href: `/appointments/${payment.appointmentId}`,
      isImported: false,
      sortKey: sortKey(payment.paidAt ?? payment.createdAt, payment.id),
    })
  }

  for (const doc of bundle.billingDocuments) {
    const href = doc.document_type === "QUOTE"
      ? `/billing/quotes/${doc.id}`
      : doc.document_type === "INVOICE"
        ? `/billing/invoices/${doc.id}`
        : `/billing/credit-notes/${doc.id}`
    events.push({
      id: `billing-${doc.id}`,
      category: "BILLING",
      typeLabel: documentTypeLabels[doc.document_type as keyof typeof documentTypeLabels] ?? "Document",
      occurredAt: doc.issued_at ?? doc.created_at,
      description: doc.document_number ?? "Brouillon",
      domainLabel: "Facturation Garage OS",
      amountLabel: money(doc.total_incl_vat_cents, doc.currency),
      statusLabel: statusLabelFor({
        document_type: doc.document_type,
        status: doc.status,
      } as never),
      href,
      isImported: false,
      sortKey: sortKey(doc.issued_at ?? doc.created_at, doc.id),
    })
  }

  for (const vehicle of bundle.vehicles) {
    const label = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Véhicule associé"
    events.push({
      id: `vehicle-${vehicle.id}`,
      category: "VEHICLE",
      typeLabel: isImportedCustomerSource(vehicle.source) ? "Véhicule importé" : "Véhicule associé",
      occurredAt: vehicle.created_at,
      description: vehicle.registration_number ? `${label} · ${vehicle.registration_number}` : label,
      domainLabel: isImportedCustomerSource(vehicle.source) ? "Historique importé" : "Parc client",
      amountLabel: null,
      statusLabel: vehicle.stock_vehicle_id ? "Lié au stock" : null,
      href: vehicle.stock_vehicle_id ? `/stock/${vehicle.stock_vehicle_id}` : null,
      isImported: isImportedCustomerSource(vehicle.source),
      sortKey: sortKey(vehicle.created_at, vehicle.id),
    })
  }

  return events.sort((a, b) => {
    const diff = Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
    if (diff !== 0) return diff
    return b.sortKey.localeCompare(a.sortKey)
  })
}

export function filterTimelineEvents(
  events: readonly CustomerTimelineEvent[],
  category: TimelineCategory,
): readonly CustomerTimelineEvent[] {
  if (category === "ALL") return events
  return events.filter((event) => event.category === category)
}

export function buildCustomerSummaryMetrics(bundle: Customer360Bundle): CustomerSummaryMetrics {
  const now = Date.now()
  const appointments = bundle.appointments
  const upcoming = appointments.filter((item) =>
    ["CONFIRMED", "PENDING", "AWAITING_PAYMENT"].includes(item.status) && Date.parse(item.starts_at) >= now,
  )
  const completed = appointments.filter((item) => item.status === "COMPLETED")

  const historicalPaidCents = bundle.historicalPayments
    .filter((item) => isHistoricalPaymentSuccessful(item.source_status))
    .reduce((sum, item) => sum + item.amount_cents, 0)

  const livePaidCents = bundle.livePayments
    .filter((item) => item.status === "PAID")
    .reduce((sum, item) => sum + item.amountCents, 0)

  const invoicedCents = bundle.billingDocuments
    .filter((item) => item.document_type === "INVOICE" && ["ISSUED", "PARTIALLY_PAID", "PAID"].includes(item.status))
    .reduce((sum, item) => sum + item.total_incl_vat_cents, 0)

  const outstandingCents = bundle.billingDocuments
    .filter((item) => item.document_type === "INVOICE" && ["ISSUED", "PARTIALLY_PAID"].includes(item.status))
    .reduce((sum, item) => sum + computeRemainingCents(item.total_incl_vat_cents, item.amount_paid_cents, item.amount_credited_cents), 0)

  const timeline = buildCustomerTimeline(bundle)
  const timestamps = timeline.map((item) => item.occurredAt).filter(Boolean)
  const sorted = timestamps.sort((a, b) => Date.parse(a) - Date.parse(b))

  const nextAppointment = upcoming.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0]

  return {
    appointmentCount: appointments.length,
    completedAppointmentCount: completed.length,
    upcomingAppointmentCount: upcoming.length,
    leadCount: bundle.leads.length,
    registrationCaseCount: bundle.registrationCases.length,
    vehicleCount: bundle.vehicles.length,
    historicalPaidCents,
    livePaidCents,
    invoicedCents,
    outstandingCents,
    firstInteractionAt: sorted[0] ?? null,
    lastInteractionAt: sorted[sorted.length - 1] ?? null,
    nextAppointmentAt: nextAppointment?.starts_at ?? null,
  }
}

export function formatTimelineWhen(value: string): string {
  return when(value)
}
