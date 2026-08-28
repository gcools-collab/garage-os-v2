import { formatCustomerName, formatFrenchPhone } from "../normalization"
import type { Customer360Bundle } from "../repositories/customer-repository"
import { buildCustomerSummaryMetrics, buildCustomerTimeline, isHistoricalPaymentSuccessful } from "../engine/customer-timeline-engine"
import type { CustomerDirectorySummary, CustomerRecord } from "../types/customer"
import { customerSourceLabels } from "../types/customer"
import type { CustomerTimelineEvent } from "../types/customer-timeline"
import { appointmentStatusLabels, appointmentTypeLabels } from "@/features/scheduling/builders/scheduling-builders"
import { leadStatusLabels, leadTypeLabels } from "@/features/leads/builders/lead-view-models"
import { registrationStatusLabels } from "@/features/registration/types/registration"
import { documentTypeLabels, statusLabelFor } from "@/features/billing/builders/billing-view-models"
import { computeRemainingCents } from "@/features/billing/engines/money-engine"

const money = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100)

export type CustomerListItemViewModel = {
  readonly id: string
  readonly name: string
  readonly emailLabel: string
  readonly phoneLabel: string
  readonly sourceLabel: string
  readonly vehicleCountLabel: string
  readonly lastInteractionLabel: string
  readonly nextAppointmentLabel: string | null
  readonly href: string
}

export function buildCustomerListItems(
  customers: readonly CustomerRecord[],
  summaries: Readonly<Record<string, CustomerDirectorySummary>>,
): readonly CustomerListItemViewModel[] {
  return customers.map((customer) => {
    const summary = summaries[customer.id]
    return {
      id: customer.id,
      name: formatCustomerName(customer.first_name, customer.last_name),
      emailLabel: customer.email ?? "E-mail non renseigné",
      phoneLabel: formatFrenchPhone(customer.phone) ?? "Téléphone non renseigné",
      sourceLabel: customerSourceLabels[customer.source],
      vehicleCountLabel: `${summary?.vehicleCount ?? 0} véhicule${(summary?.vehicleCount ?? 0) > 1 ? "s" : ""}`,
      lastInteractionLabel: summary?.lastInteractionAt
        ? new Date(summary.lastInteractionAt).toLocaleDateString("fr-FR")
        : "Aucune interaction",
      nextAppointmentLabel: summary?.nextAppointmentAt
        ? new Date(summary.nextAppointmentAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
        : null,
      href: `/customers/${customer.id}`,
    }
  })
}

export type CustomerDetailViewModel = {
  readonly id: string
  readonly name: string
  readonly email: string | null
  readonly phone: string | null
  readonly phoneHref: string | null
  readonly emailHref: string | null
  readonly addressLabel: string | null
  readonly sourceLabel: string
  readonly createdAtLabel: string
  readonly notes: string | null
  readonly metrics: ReturnType<typeof buildCustomerSummaryMetrics>
  readonly timeline: readonly CustomerTimelineEvent[]
  readonly vehicles: readonly {
    readonly id: string
    readonly title: string
    readonly registration: string | null
    readonly vin: string | null
    readonly stockHref: string | null
    readonly isStockLinked: boolean
    readonly sourceLabel: string
  }[]
  readonly leads: readonly {
    readonly id: string
    readonly typeLabel: string
    readonly statusLabel: string
    readonly messagePreview: string | null
    readonly createdAtLabel: string
    readonly href: string
    readonly isImported: boolean
  }[]
  readonly appointments: readonly {
    readonly id: string
    readonly typeLabel: string
    readonly statusLabel: string
    readonly whenLabel: string
    readonly href: string | null
    readonly isHistorical: boolean
    readonly isUpcoming: boolean
  }[]
  readonly registrationCases: readonly {
    readonly id: string
    readonly reference: string
    readonly title: string
    readonly statusLabel: string
    readonly vehicleLabel: string
    readonly href: string
  }[]
  readonly financialItems: readonly {
    readonly id: string
    readonly label: string
    readonly amountLabel: string
    readonly statusLabel: string
    readonly whenLabel: string
    readonly kind: "historical" | "live" | "billing"
    readonly countsAsRevenue: boolean
    readonly href: string | null
  }[]
  readonly billingDocuments: readonly {
    readonly id: string
    readonly typeLabel: string
    readonly numberLabel: string
    readonly statusLabel: string
    readonly amountLabel: string
    readonly outstandingLabel: string | null
    readonly href: string
  }[]
  readonly quickActions: readonly {
    readonly label: string
    readonly href: string
    readonly external?: boolean
  }[]
}

export function buildCustomerDetailViewModel(bundle: Customer360Bundle): CustomerDetailViewModel {
  const { customer } = bundle
  const metrics = buildCustomerSummaryMetrics(bundle)
  const timeline = buildCustomerTimeline(bundle)
  const now = Date.now()

  const vehicles = bundle.vehicles.map((vehicle) => ({
    id: vehicle.id,
    title: [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ") || "Véhicule",
    registration: vehicle.registration_number,
    vin: vehicle.vin,
    stockHref: vehicle.stock_vehicle_id ? `/stock/${vehicle.stock_vehicle_id}` : null,
    isStockLinked: Boolean(vehicle.stock_vehicle_id),
    sourceLabel: customerSourceLabels[vehicle.source],
  }))

  const leads = bundle.leads.map((lead) => {
    const legacy = (lead as { legacy_source?: string | null }).legacy_source
    const message = lead.message?.trim() ?? null
    return {
      id: lead.id,
      typeLabel: leadTypeLabels[lead.type],
      statusLabel: leadStatusLabels[lead.status],
      messagePreview: message ? (message.length > 240 ? `${message.slice(0, 240)}…` : message) : null,
      createdAtLabel: new Date(lead.created_at).toLocaleDateString("fr-FR"),
      href: `/leads/${lead.id}`,
      isImported: Boolean(legacy),
    }
  })

  const appointments = bundle.appointments.map((appointment) => ({
    id: appointment.id,
    typeLabel: appointmentTypeLabels[appointment.type],
    statusLabel: appointmentStatusLabels[appointment.status],
    whenLabel: new Date(appointment.starts_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }),
    href: appointment.is_historical ? null : `/appointments/${appointment.id}`,
    isHistorical: appointment.is_historical,
    isUpcoming: ["CONFIRMED", "PENDING", "AWAITING_PAYMENT"].includes(appointment.status) && Date.parse(appointment.starts_at) >= now,
  }))

  const registrationCases = bundle.registrationCases.map((item) => ({
    id: item.id,
    reference: item.public_reference,
    title: item.procedure_title,
    statusLabel: registrationStatusLabels[item.status as keyof typeof registrationStatusLabels] ?? item.status,
    vehicleLabel: [item.brand, item.model, item.registration_number].filter(Boolean).join(" · ") || "Véhicule non renseigné",
    href: `/registration/${item.id}`,
  }))

  const financialItems = [
    ...bundle.historicalPayments.map((payment) => ({
      id: payment.id,
      label: "Paiement historique",
      amountLabel: money(payment.amount_cents),
      statusLabel: payment.source_status,
      whenLabel: new Date(payment.occurred_at ?? payment.created_at).toLocaleDateString("fr-FR"),
      kind: "historical" as const,
      countsAsRevenue: isHistoricalPaymentSuccessful(payment.source_status),
      href: null,
    })),
    ...bundle.livePayments.map((payment) => ({
      id: payment.id,
      label: "Paiement Garage OS",
      amountLabel: money(payment.amountCents),
      statusLabel: payment.status,
      whenLabel: new Date(payment.paidAt ?? payment.createdAt).toLocaleDateString("fr-FR"),
      kind: "live" as const,
      countsAsRevenue: payment.status === "PAID",
      href: `/appointments/${payment.appointmentId}`,
    })),
    ...bundle.billingDocuments.map((doc) => ({
      id: doc.id,
      label: `${documentTypeLabels[doc.document_type as keyof typeof documentTypeLabels] ?? "Document"} ${doc.document_number ?? "brouillon"}`,
      amountLabel: money(doc.total_incl_vat_cents),
      statusLabel: statusLabelFor({ document_type: doc.document_type, status: doc.status } as never),
      whenLabel: new Date(doc.issued_at ?? doc.created_at).toLocaleDateString("fr-FR"),
      kind: "billing" as const,
      countsAsRevenue: doc.document_type === "INVOICE" && ["ISSUED", "PARTIALLY_PAID", "PAID"].includes(doc.status),
      href: doc.document_type === "QUOTE"
        ? `/billing/quotes/${doc.id}`
        : doc.document_type === "INVOICE"
          ? `/billing/invoices/${doc.id}`
          : `/billing/credit-notes/${doc.id}`,
    })),
  ].sort((a, b) => Date.parse(b.whenLabel) - Date.parse(a.whenLabel))

  const billingDocuments = bundle.billingDocuments.map((doc) => {
    const remaining = doc.document_type === "INVOICE"
      ? computeRemainingCents(doc.total_incl_vat_cents, doc.amount_paid_cents, doc.amount_credited_cents)
      : null
    return {
      id: doc.id,
      typeLabel: documentTypeLabels[doc.document_type as keyof typeof documentTypeLabels] ?? doc.document_type,
      numberLabel: doc.document_number ?? "Brouillon",
      statusLabel: statusLabelFor({ document_type: doc.document_type, status: doc.status } as never),
      amountLabel: money(doc.total_incl_vat_cents),
      outstandingLabel: remaining && remaining > 0 ? money(remaining) : null,
      href: doc.document_type === "QUOTE"
        ? `/billing/quotes/${doc.id}`
        : doc.document_type === "INVOICE"
          ? `/billing/invoices/${doc.id}`
          : `/billing/credit-notes/${doc.id}`,
    }
  })

  const quickActions: Array<{ label: string; href: string; external?: boolean }> = []
  if (customer.phone) quickActions.push({ label: "Appeler", href: `tel:${customer.normalized_phone ?? customer.phone}`, external: true })
  if (customer.email) quickActions.push({ label: "Envoyer un e-mail", href: `mailto:${customer.email}`, external: true })
  quickActions.push({ label: "Créer une demande commerciale", href: `#create-lead` })
  quickActions.push({ label: "Créer un rendez-vous", href: `/appointments/new?customerId=${customer.id}` })
  quickActions.push({ label: "Créer un dossier carte grise", href: `/registration/new?customerId=${customer.id}` })
  quickActions.push({ label: "Créer un devis", href: `/billing/quotes/new?customerId=${customer.id}` })
  quickActions.push({ label: "Créer une facture", href: `/billing/invoices/new?customerId=${customer.id}` })
  if (metrics.nextAppointmentAt) {
    const upcoming = appointments.find((item) => item.isUpcoming)
    if (upcoming?.href) quickActions.push({ label: "Prochain rendez-vous", href: upcoming.href })
  }

  const addressParts = [customer.address_line, [customer.postal_code, customer.city].filter(Boolean).join(" ")].filter(Boolean)

  return {
    id: customer.id,
    name: formatCustomerName(customer.first_name, customer.last_name),
    email: customer.email,
    phone: formatFrenchPhone(customer.phone),
    phoneHref: customer.phone ? `tel:${customer.normalized_phone ?? customer.phone}` : null,
    emailHref: customer.email ? `mailto:${customer.email}` : null,
    addressLabel: addressParts.length ? addressParts.join(", ") : null,
    sourceLabel: customerSourceLabels[customer.source],
    createdAtLabel: new Date(customer.created_at).toLocaleDateString("fr-FR"),
    notes: customer.notes,
    metrics,
    timeline,
    vehicles,
    leads,
    appointments,
    registrationCases,
    financialItems,
    billingDocuments,
    quickActions,
  }
}
