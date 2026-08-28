import type { BillingDocumentLineRecord, BillingDocumentRecord } from "../types/billing"
import type {
  ElectronicInvoiceReadiness,
  ExtendedBillingCustomerSnapshot,
  ExtendedBillingIssuerSnapshot,
  TransactionNature,
} from "../types/e-invoicing"
import { classifyFromSnapshots } from "./french-regulatory-classifier"

const REQUIRED_SELLER_FIELDS = ["siret", "vatNumber", "legalName", "addressLine1", "postalCode", "city"] as const
const REQUIRED_BUYER_B2B_FIELDS = ["name", "addressLine", "postalCode", "city"] as const

function missingFields(
  snapshot: Record<string, unknown>,
  fields: readonly string[],
): string[] {
  return fields.filter((field) => {
    const value = snapshot[field]
    return typeof value !== "string" || value.trim().length === 0
  })
}

export function validateElectronicInvoiceReadiness(input: {
  readonly document: BillingDocumentRecord
  readonly lines: readonly BillingDocumentLineRecord[]
  readonly transactionNature: TransactionNature
}): ElectronicInvoiceReadiness {
  const issuer = (input.document.issuer_snapshot ?? {}) as ExtendedBillingIssuerSnapshot
  const customer = (input.document.customer_snapshot ?? {}) as ExtendedBillingCustomerSnapshot
  const classification = classifyFromSnapshots({
    customer,
    issuer,
    transactionNature: input.transactionNature,
  })

  const errors: string[] = []
  const warnings: string[] = [...classification.reasons]

  if (input.document.document_type !== "INVOICE") {
    errors.push("Seules les factures émises peuvent être transmises électroniquement.")
  }
  if (!["ISSUED", "PARTIALLY_PAID", "PAID"].includes(input.document.status)) {
    errors.push("La facture doit être émise avant toute transmission réglementaire.")
  }
  if (!input.document.document_number) {
    errors.push("Numéro de facture manquant.")
  }
  if (input.lines.length === 0) {
    errors.push("Aucune ligne de facturation.")
  }

  const missingSellerFields = missingFields(issuer as Record<string, unknown>, REQUIRED_SELLER_FIELDS)
  const missingBuyerFields = missingFields(customer as Record<string, unknown>, REQUIRED_BUYER_B2B_FIELDS)

  for (const field of missingSellerFields) {
    errors.push(`Émetteur : champ requis manquant (${field}).`)
  }

  if (classification.recipientContext === "B2B_FR" || classification.recipientContext === "B2G_FR") {
    for (const field of missingBuyerFields) {
      errors.push(`Client B2B : champ requis manquant (${field}).`)
    }
    if (!customer.siren && !customer.vatNumber) {
      errors.push("Client B2B : SIREN ou numéro de TVA requis.")
    }
  }

  if (classification.recipientContext === "B2C_FR") {
    warnings.push("Client particulier : Garage OS ne transmet pas une facture électronique B2B via PA pour ce flux.")
  }

  if (classification.regulatoryRoute === "E_REPORTING_ONLY") {
    warnings.push("Ce document relève de l'e-reporting — transmission PA B2B non applicable.")
  }

  return {
    ready: errors.length === 0 && classification.paTransmissionEligible,
    errors,
    warnings,
    classification,
    missingSellerFields,
    missingBuyerFields,
  }
}
