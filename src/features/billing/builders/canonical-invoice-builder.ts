import type { BillingDocumentBundle } from "../types/billing"
import type {
  CanonicalInvoiceParty,
  CanonicalStructuredInvoice,
  ExtendedBillingCustomerSnapshot,
  ExtendedBillingIssuerSnapshot,
  TransactionNature,
} from "../types/e-invoicing"
import { classifyFromSnapshots } from "../engines/french-regulatory-classifier"

function customerParty(snapshot: ExtendedBillingCustomerSnapshot, fallbackName: string): CanonicalInvoiceParty {
  return {
    name: snapshot.name?.trim() || fallbackName,
    companyName: snapshot.companyName ?? null,
    siren: snapshot.siren ?? null,
    siret: null,
    vatNumber: snapshot.vatNumber ?? null,
    addressLine1: snapshot.addressLine ?? null,
    addressLine2: null,
    postalCode: snapshot.postalCode ?? null,
    city: snapshot.city ?? null,
    countryCode: snapshot.countryCode ?? "FR",
    email: snapshot.email ?? null,
    phone: snapshot.phone ?? null,
  }
}

function issuerParty(snapshot: ExtendedBillingIssuerSnapshot, fallbackName: string): CanonicalInvoiceParty {
  return {
    name: snapshot.legalName?.trim() || snapshot.displayName?.trim() || fallbackName,
    companyName: snapshot.legalName ?? snapshot.displayName ?? null,
    siren: snapshot.siren ?? null,
    siret: snapshot.siret ?? null,
    vatNumber: snapshot.vatNumber ?? null,
    addressLine1: snapshot.addressLine1 ?? null,
    addressLine2: snapshot.addressLine2 ?? null,
    postalCode: snapshot.postalCode ?? null,
    city: snapshot.city ?? null,
    countryCode: snapshot.countryCode ?? "FR",
    email: snapshot.email ?? null,
    phone: snapshot.phone ?? null,
  }
}

export function buildCanonicalStructuredInvoice(
  bundle: BillingDocumentBundle,
  transactionNature: TransactionNature,
): CanonicalStructuredInvoice {
  const { document, lines } = bundle
  const issuer = document.issuer_snapshot as ExtendedBillingIssuerSnapshot
  const customer = document.customer_snapshot as ExtendedBillingCustomerSnapshot
  const classification = classifyFromSnapshots({ customer, issuer, transactionNature })

  const deliveryAddress = customer.deliveryAddressLine ?? issuer.deliveryAddressLine1
  const delivery = deliveryAddress
    ? {
        ...customerParty(customer, customer.name ?? "Client"),
        addressLine1: deliveryAddress,
        postalCode: customer.deliveryPostalCode ?? issuer.deliveryPostalCode ?? customer.postalCode ?? null,
        city: customer.deliveryCity ?? issuer.deliveryCity ?? customer.city ?? null,
        countryCode: issuer.deliveryCountryCode ?? customer.countryCode ?? "FR",
      }
    : null

  return {
    documentId: document.id,
    documentNumber: document.document_number ?? "BROUILLON",
    issueDate: document.issue_date ?? document.issued_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    dueDate: document.due_date,
    currency: document.currency,
    transactionNature,
    recipientContext: classification.recipientContext,
    regulatoryRoute: classification.regulatoryRoute,
    seller: issuerParty(issuer, issuer.displayName ?? "Garage"),
    buyer: customerParty(customer, customer.name ?? "Client"),
    delivery,
    lines: lines.map((line) => ({
      lineOrder: line.line_order,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceExclVatCents: line.unit_price_excl_vat_cents,
      vatRateBps: line.vat_rate_bps,
      lineTotalExclVatCents: line.line_total_excl_vat_cents,
      vatAmountCents: line.vat_amount_cents,
      lineTotalInclVatCents: line.line_total_incl_vat_cents,
    })),
    subtotalExclVatCents: document.subtotal_excl_vat_cents,
    totalVatCents: document.total_vat_cents,
    totalInclVatCents: document.total_incl_vat_cents,
    paymentStatus: document.amount_paid_cents >= document.total_incl_vat_cents ? "PAID" : document.amount_paid_cents > 0 ? "PARTIALLY_PAID" : "UNPAID",
    businessStatus: document.status,
    transmissionStatus: document.electronic_status,
  }
}
