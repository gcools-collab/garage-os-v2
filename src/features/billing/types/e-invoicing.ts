import type { BillingCustomerSnapshot, BillingDocumentLineRecord, BillingDocumentRecord, BillingIssuerSnapshot } from "./billing"

export const TRANSACTION_NATURES = ["GOODS", "SERVICES", "MIXED"] as const
export type TransactionNature = (typeof TRANSACTION_NATURES)[number]

export const RECIPIENT_CONTEXTS = ["B2B_FR", "B2C_FR", "B2G_FR", "INTERNATIONAL"] as const
export type RecipientContext = (typeof RECIPIENT_CONTEXTS)[number]

export const ELECTRONIC_INVOICE_PROVIDERS = ["NONE", "B2BROUTER", "TIIME", "BILLIT"] as const
export type ElectronicInvoiceProviderName = (typeof ELECTRONIC_INVOICE_PROVIDERS)[number]

export const PROVIDER_MODES = ["DISABLED", "UNCONFIGURED", "SANDBOX", "PRODUCTION"] as const
export type ProviderMode = (typeof PROVIDER_MODES)[number]

export const REGULATORY_ROUTES = [
  "NOT_APPLICABLE",
  "E_INVOICE_PA",
  "E_REPORTING_ONLY",
  "MANUAL_REVIEW",
] as const
export type RegulatoryRoute = (typeof REGULATORY_ROUTES)[number]

export type ExtendedBillingCustomerSnapshot = BillingCustomerSnapshot & Readonly<{
  companyName?: string | null
  firstName?: string | null
  lastName?: string | null
  countryCode?: string
  siren?: string | null
  vatNumber?: string | null
  deliveryAddressLine?: string | null
  deliveryPostalCode?: string | null
  deliveryCity?: string | null
}>

export type ExtendedBillingIssuerSnapshot = BillingIssuerSnapshot & Readonly<{
  defaultTransactionNature?: TransactionNature
  deliveryAddressLine1?: string | null
  deliveryAddressLine2?: string | null
  deliveryPostalCode?: string | null
  deliveryCity?: string | null
  deliveryCountryCode?: string | null
}>

export type RegulatoryClassification = Readonly<{
  recipientContext: RecipientContext
  regulatoryRoute: RegulatoryRoute
  paTransmissionEligible: boolean
  eReportingRequired: boolean
  reasons: readonly string[]
}>

export type ElectronicInvoiceReadiness = Readonly<{
  ready: boolean
  errors: readonly string[]
  warnings: readonly string[]
  classification: RegulatoryClassification
  missingSellerFields: readonly string[]
  missingBuyerFields: readonly string[]
}>

export type CanonicalInvoiceParty = Readonly<{
  name: string
  companyName: string | null
  siren: string | null
  siret: string | null
  vatNumber: string | null
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  city: string | null
  countryCode: string
  email: string | null
  phone: string | null
}>

export type CanonicalInvoiceLine = Readonly<{
  lineOrder: number
  description: string
  quantity: number
  unit: string
  unitPriceExclVatCents: number
  vatRateBps: number
  lineTotalExclVatCents: number
  vatAmountCents: number
  lineTotalInclVatCents: number
}>

export type CanonicalStructuredInvoice = Readonly<{
  documentId: string
  documentNumber: string
  issueDate: string
  dueDate: string | null
  currency: string
  transactionNature: TransactionNature
  recipientContext: RecipientContext
  regulatoryRoute: RegulatoryRoute
  seller: CanonicalInvoiceParty
  buyer: CanonicalInvoiceParty
  delivery: CanonicalInvoiceParty | null
  lines: readonly CanonicalInvoiceLine[]
  subtotalExclVatCents: number
  totalVatCents: number
  totalInclVatCents: number
  paymentStatus: string
  businessStatus: BillingDocumentRecord["status"]
  transmissionStatus: BillingDocumentRecord["electronic_status"]
}>

export type ProviderValidationError = Readonly<{
  code: string
  message: string
  field?: string
}>

export type ProviderSubmissionResult = Readonly<{
  status: BillingDocumentRecord["electronic_status"]
  providerReference: string | null
  providerValidationErrors: readonly ProviderValidationError[]
  metadata: Readonly<Record<string, unknown>>
}>

export type ProviderStatusUpdate = Readonly<{
  status: BillingDocumentRecord["electronic_status"]
  providerReference: string | null
  providerValidationErrors: readonly ProviderValidationError[]
  metadata: Readonly<Record<string, unknown>>
}>

export type ElectronicInvoiceSubmissionContext = Readonly<{
  document: BillingDocumentRecord
  lines: readonly BillingDocumentLineRecord[]
  canonical: CanonicalStructuredInvoice
  classification: RegulatoryClassification
}>

export type GarageElectronicInvoiceSettingsRecord = Readonly<{
  garage_id: string
  provider_name: ElectronicInvoiceProviderName
  provider_mode: ProviderMode
  sandbox_account_id: string | null
  production_account_id: string | null
}>

export type IncomingElectronicInvoiceEvent = Readonly<{
  providerReference: string
  eventType: "RECEIVED" | "STATUS_CHANGED" | "ACKNOWLEDGED"
  occurredAt: string
  metadata: Readonly<Record<string, unknown>>
}>

export type ElectronicInvoiceProviderCapabilities = Readonly<{
  supportsOutgoingInvoices: boolean
  supportsIncomingInvoices: boolean
  supportsEReporting: boolean
  supportsCreditNotes: boolean
}>
