import type {
  ExtendedBillingCustomerSnapshot,
  ExtendedBillingIssuerSnapshot,
  RecipientContext,
  RegulatoryClassification,
  RegulatoryRoute,
  TransactionNature,
} from "../types/e-invoicing"

export type CustomerFiscalProfile = Readonly<{
  companyName: string | null
  siren: string | null
  vatNumber: string | null
  countryCode: string
  addressLine: string | null
  postalCode: string | null
  city: string | null
}>

const FRANCE = "FR"

function normalizeCountry(code: string | null | undefined): string {
  return (code ?? FRANCE).trim().toUpperCase()
}

function isFrenchBusinessCustomer(profile: CustomerFiscalProfile): boolean {
  if (normalizeCountry(profile.countryCode) !== FRANCE) return false
  return Boolean(profile.siren?.trim() || profile.vatNumber?.trim() || profile.companyName?.trim())
}

export function classifyRecipientContext(profile: CustomerFiscalProfile): RecipientContext {
  const country = normalizeCountry(profile.countryCode)
  if (country !== FRANCE) return "INTERNATIONAL"
  if (isFrenchBusinessCustomer(profile)) return "B2B_FR"
  return "B2C_FR"
}

export function classifyFrenchRegulatoryRoute(input: {
  readonly recipientContext: RecipientContext
  readonly transactionNature: TransactionNature
  readonly buyerSiren: string | null
}): RegulatoryClassification {
  const reasons: string[] = []
  let regulatoryRoute: RegulatoryRoute = "NOT_APPLICABLE"
  let paTransmissionEligible = false
  let eReportingRequired = false

  switch (input.recipientContext) {
    case "B2B_FR":
      regulatoryRoute = "E_INVOICE_PA"
      paTransmissionEligible = true
      reasons.push("Client professionnel français — transmission PA éligible si configurée.")
      if (!input.buyerSiren) {
        reasons.push("SIREN client absent — identifiant B2B recommandé avant transmission.")
      }
      break
    case "B2G_FR":
      regulatoryRoute = "E_INVOICE_PA"
      paTransmissionEligible = true
      reasons.push("Client secteur public — flux PA/Chorus requis via plateforme agréée.")
      break
    case "B2C_FR":
      regulatoryRoute = "E_REPORTING_ONLY"
      eReportingRequired = true
      reasons.push("Client particulier — pas de facture électronique B2B ; e-reporting à prévoir.")
      break
    case "INTERNATIONAL":
      regulatoryRoute = "E_REPORTING_ONLY"
      eReportingRequired = true
      reasons.push("Client hors France — pas de flux B2B domestique ; e-reporting/export à traiter.")
      break
  }

  if (input.transactionNature === "MIXED") {
    reasons.push("Nature MIXED — vérifier la ventilation biens/services côté e-reporting.")
  }

  return {
    recipientContext: input.recipientContext,
    regulatoryRoute,
    paTransmissionEligible,
    eReportingRequired,
    reasons,
  }
}

export function classifyFromSnapshots(input: {
  readonly customer: ExtendedBillingCustomerSnapshot
  readonly issuer: ExtendedBillingIssuerSnapshot
  readonly transactionNature: TransactionNature
}): RegulatoryClassification {
  const recipientContext = classifyRecipientContext({
    companyName: input.customer.companyName ?? null,
    siren: input.customer.siren ?? null,
    vatNumber: input.customer.vatNumber ?? null,
    countryCode: input.customer.countryCode ?? FRANCE,
    addressLine: input.customer.addressLine ?? null,
    postalCode: input.customer.postalCode ?? null,
    city: input.customer.city ?? null,
  })

  return classifyFrenchRegulatoryRoute({
    recipientContext,
    transactionNature: input.transactionNature,
    buyerSiren: input.customer.siren ?? null,
  })
}

export const recipientContextLabels: Record<RecipientContext, string> = {
  B2B_FR: "Professionnel (France)",
  B2C_FR: "Particulier (France)",
  B2G_FR: "Secteur public (France)",
  INTERNATIONAL: "International",
}

export const regulatoryRouteLabels: Record<RegulatoryRoute, string> = {
  NOT_APPLICABLE: "Non applicable",
  E_INVOICE_PA: "Facturation électronique via PA",
  E_REPORTING_ONLY: "E-reporting uniquement",
  MANUAL_REVIEW: "Revue manuelle requise",
}
