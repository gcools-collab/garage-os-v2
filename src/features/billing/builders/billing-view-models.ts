import { formatCustomerName } from "@/features/customers/normalization"
import { computeRemainingCents, formatMoney, formatVatRate, isDocumentEditable } from "../engines/money-engine"
import type { BillingDocumentBundle, BillingDocumentRecord } from "../types/billing"

export const documentTypeLabels = {
  QUOTE: "Devis",
  INVOICE: "Facture",
  CREDIT_NOTE: "Avoir",
} as const

export const quoteStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  DECLINED: "Refusé",
  EXPIRED: "Expiré",
  CANCELLED: "Annulé",
  CONVERTED: "Converti",
}

export const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  CANCELLED: "Annulée",
}

export const creditNoteStatusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émis",
}

export const paymentMethodLabels: Record<string, string> = {
  CASH: "Espèces",
  CHECK: "Chèque",
  BANK_TRANSFER: "Virement",
  CARD: "Carte",
  OTHER: "Autre",
}

export function statusLabelFor(document: Pick<BillingDocumentRecord, "document_type" | "status">): string {
  if (document.document_type === "QUOTE") return quoteStatusLabels[document.status] ?? document.status
  if (document.document_type === "INVOICE") return invoiceStatusLabels[document.status] ?? document.status
  return creditNoteStatusLabels[document.status] ?? document.status
}

export type BillingListItemViewModel = Readonly<{
  id: string
  documentNumber: string
  customerLabel: string
  statusLabel: string
  amountLabel: string
  dateLabel: string
  outstandingLabel: string | null
  href: string
}>

export function buildBillingListItem(
  document: BillingDocumentRecord,
  customerName?: string,
): BillingListItemViewModel {
  const remaining = document.document_type === "INVOICE"
    ? computeRemainingCents(document.total_incl_vat_cents, document.amount_paid_cents, document.amount_credited_cents)
    : null

  const basePath = document.document_type === "QUOTE"
    ? "quotes"
    : document.document_type === "INVOICE"
      ? "invoices"
      : "credit-notes"

  return {
    id: document.id,
    documentNumber: document.document_number ?? "Brouillon",
    customerLabel: customerName ?? document.customer_snapshot?.name ?? "Client",
    statusLabel: statusLabelFor(document),
    amountLabel: formatMoney(document.total_incl_vat_cents, document.currency),
    dateLabel: document.issue_date
      ? new Date(document.issue_date).toLocaleDateString("fr-FR")
      : new Date(document.created_at).toLocaleDateString("fr-FR"),
    outstandingLabel: remaining !== null && remaining > 0 ? formatMoney(remaining, document.currency) : null,
    href: `/billing/${basePath}/${document.id}`,
  }
}

export type BillingDetailViewModel = Readonly<{
  id: string
  documentType: BillingDocumentRecord["document_type"]
  documentTypeLabel: string
  documentNumber: string
  statusLabel: string
  editable: boolean
  customerLabel: string
  customerHref: string | null
  issuerLabel: string
  issuerWarnings: readonly string[]
  issueDateLabel: string | null
  validUntilLabel: string | null
  subtotalLabel: string
  vatLabel: string
  totalLabel: string
  paidLabel: string
  creditedLabel: string | null
  remainingLabel: string | null
  lines: readonly {
    id: string
    description: string
    quantity: number
    unit: string
    unitPriceLabel: string
    vatRateLabel: string
    lineTotalLabel: string
  }[]
  payments: readonly {
    id: string
    amountLabel: string
    methodLabel: string
    dateLabel: string
    reference: string | null
  }[]
  events: readonly {
    id: string
    label: string
    dateLabel: string
  }[]
  linkedQuoteHref: string | null
  linkedInvoiceHref: string | null
  convertedInvoiceHref: string | null
  creditNoteHrefs: readonly { id: string; href: string; label: string }[]
  notes: string | null
  electronicStatusLabel: string
}>

export function buildBillingDetailViewModel(bundle: BillingDetailViewModelInput): BillingDetailViewModel {
  const { document, lines, payments, events, linkedQuote, linkedInvoice, creditNotes } = bundle
  const issuer = document.issuer_snapshot ?? {}
  const customer = document.customer_snapshot ?? {}

  const issuerWarnings: string[] = []
  if (!issuer.siret) issuerWarnings.push("SIRET non configuré — renseignez les informations fiscales du garage.")
  if (!issuer.vatNumber) issuerWarnings.push("Numéro de TVA non configuré.")

  const remaining = document.document_type === "INVOICE"
    ? computeRemainingCents(document.total_incl_vat_cents, document.amount_paid_cents, document.amount_credited_cents)
    : null

  return {
    id: document.id,
    documentType: document.document_type,
    documentTypeLabel: documentTypeLabels[document.document_type],
    documentNumber: document.document_number ?? "Brouillon",
    statusLabel: statusLabelFor(document),
    editable: isDocumentEditable(document.status),
    customerLabel: customer.name ?? "Client",
    customerHref: document.customer_id ? `/customers/${document.customer_id}` : null,
    issuerLabel: issuer.legalName ?? issuer.displayName ?? "Garage",
    issuerWarnings,
    issueDateLabel: document.issue_date ? new Date(document.issue_date).toLocaleDateString("fr-FR") : null,
    validUntilLabel: document.valid_until ? new Date(document.valid_until).toLocaleDateString("fr-FR") : null,
    subtotalLabel: formatMoney(document.subtotal_excl_vat_cents, document.currency),
    vatLabel: formatMoney(document.total_vat_cents, document.currency),
    totalLabel: formatMoney(document.total_incl_vat_cents, document.currency),
    paidLabel: formatMoney(document.amount_paid_cents, document.currency),
    creditedLabel: document.document_type === "INVOICE" ? formatMoney(document.amount_credited_cents, document.currency) : null,
    remainingLabel: remaining !== null ? formatMoney(remaining, document.currency) : null,
    lines: lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceLabel: formatMoney(line.unit_price_excl_vat_cents, document.currency),
      vatRateLabel: formatVatRate(line.vat_rate_bps),
      lineTotalLabel: formatMoney(line.line_total_incl_vat_cents, document.currency),
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      amountLabel: formatMoney(payment.amount_cents, payment.currency),
      methodLabel: paymentMethodLabels[payment.payment_method] ?? payment.payment_method,
      dateLabel: new Date(payment.paid_at).toLocaleDateString("fr-FR"),
      reference: payment.reference,
    })),
    events: events.map((event) => ({
      id: event.id,
      label: event.new_status ? `${event.event_type} → ${event.new_status}` : event.event_type,
      dateLabel: new Date(event.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }),
    })),
    linkedQuoteHref: linkedQuote ? `/billing/quotes/${linkedQuote.id}` : null,
    linkedInvoiceHref: linkedInvoice ? `/billing/invoices/${linkedInvoice.id}` : null,
    convertedInvoiceHref: document.converted_invoice_id ? `/billing/invoices/${document.converted_invoice_id}` : null,
    creditNoteHrefs: creditNotes.map((item) => ({
      id: item.id,
      href: `/billing/credit-notes/${item.id}`,
      label: item.document_number ?? "Avoir",
    })),
    notes: document.notes,
    electronicStatusLabel: document.electronic_status.replaceAll("_", " "),
  }
}

type BillingDetailViewModelInput = BillingDocumentBundle & {
  readonly customerName?: string
}

export function buildCustomerBillingItems(
  documents: readonly BillingDocumentRecord[],
  customer: { readonly first_name: string | null; readonly last_name: string | null },
): readonly BillingListItemViewModel[] {
  const name = formatCustomerName(customer.first_name, customer.last_name)
  return documents.map((doc) => buildBillingListItem(doc, name))
}
