export const BILLING_DOCUMENT_TYPES = ["QUOTE", "INVOICE", "CREDIT_NOTE"] as const
export type BillingDocumentType = (typeof BILLING_DOCUMENT_TYPES)[number]

export const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "CONVERTED"] as const
export const INVOICE_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"] as const
export const CREDIT_NOTE_STATUSES = ["DRAFT", "ISSUED"] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]
export type CreditNoteStatus = (typeof CREDIT_NOTE_STATUSES)[number]
export type BillingDocumentStatus = QuoteStatus | InvoiceStatus | CreditNoteStatus

export const ELECTRONIC_STATUSES = [
  "NOT_REQUIRED",
  "NOT_SUBMITTED",
  "READY",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "ERROR",
] as const
export type ElectronicStatus = (typeof ELECTRONIC_STATUSES)[number]

export const PAYMENT_METHODS = ["CASH", "CHECK", "BANK_TRANSFER", "CARD", "OTHER"] as const
export type InvoicePaymentMethod = (typeof PAYMENT_METHODS)[number]

export type BillingCustomerSnapshot = Readonly<{
  customerId?: string
  name?: string
  companyName?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  addressLine?: string | null
  postalCode?: string | null
  city?: string | null
  countryCode?: string
  siren?: string | null
  vatNumber?: string | null
  deliveryAddressLine?: string | null
  deliveryPostalCode?: string | null
  deliveryCity?: string | null
}>

export type BillingIssuerSnapshot = Readonly<{
  garageId?: string
  displayName?: string
  legalName?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  postalCode?: string | null
  city?: string | null
  countryCode?: string
  phone?: string | null
  email?: string | null
  siren?: string | null
  siret?: string | null
  vatNumber?: string | null
  legalForm?: string | null
  invoiceFooterText?: string | null
}>

export type BillingDocumentLineRecord = Readonly<{
  id: string
  garage_id: string
  document_id: string
  line_order: number
  description: string
  quantity: number
  unit: string
  unit_price_excl_vat_cents: number
  vat_rate_bps: number
  discount_bps: number
  line_total_excl_vat_cents: number
  vat_amount_cents: number
  line_total_incl_vat_cents: number
  service_offer_id: string | null
  created_at: string
}>

export type BillingDocumentRecord = Readonly<{
  id: string
  garage_id: string
  document_type: BillingDocumentType
  status: BillingDocumentStatus
  document_number: string | null
  customer_id: string
  appointment_id: string | null
  registration_case_id: string | null
  customer_vehicle_id: string | null
  vehicle_id: string | null
  source_quote_id: string | null
  source_invoice_id: string | null
  converted_invoice_id: string | null
  issue_date: string | null
  due_date: string | null
  valid_until: string | null
  customer_snapshot: BillingCustomerSnapshot
  issuer_snapshot: BillingIssuerSnapshot
  vehicle_context: Readonly<Record<string, unknown>>
  subtotal_excl_vat_cents: number
  total_vat_cents: number
  total_incl_vat_cents: number
  amount_paid_cents: number
  amount_credited_cents: number
  currency: string
  credit_note_reason: string | null
  electronic_status: ElectronicStatus
  electronic_provider_ref: string | null
  electronic_provider_metadata: Readonly<Record<string, unknown>>
  electronic_submission_errors: readonly Readonly<{ readonly code?: string; readonly message: string }>[]
  transaction_nature: "GOODS" | "SERVICES" | "MIXED" | null
  recipient_context: "B2B_FR" | "B2C_FR" | "B2G_FR" | "INTERNATIONAL" | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  issued_at: string | null
  sent_at: string | null
  accepted_at: string | null
}>

export type InvoicePaymentRecord = Readonly<{
  id: string
  garage_id: string
  invoice_id: string
  amount_cents: number
  currency: string
  payment_method: InvoicePaymentMethod
  paid_at: string
  reference: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}>

export type BillingDocumentEventRecord = Readonly<{
  id: string
  garage_id: string
  document_id: string
  actor_id: string | null
  event_type: string
  old_status: string | null
  new_status: string | null
  metadata: Readonly<Record<string, unknown>>
  created_at: string
}>

export type BillingDocumentBundle = Readonly<{
  document: BillingDocumentRecord
  lines: readonly BillingDocumentLineRecord[]
  payments: readonly InvoicePaymentRecord[]
  events: readonly BillingDocumentEventRecord[]
  linkedQuote: BillingDocumentRecord | null
  linkedInvoice: BillingDocumentRecord | null
  creditNotes: readonly BillingDocumentRecord[]
}>

export type BillingLineInput = Readonly<{
  lineId?: string | null
  lineOrder: number
  description: string
  quantity: number
  unit: string
  unitPriceExclVatCents: number
  vatRateBps: number
  discountBps?: number
  serviceOfferId?: string | null
}>

export type GarageFiscalSettingsRecord = Readonly<{
  garage_id: string
  siren: string | null
  siret: string | null
  vat_number: string | null
  legal_form: string | null
  default_vat_rate_bps: number
  default_transaction_nature: "GOODS" | "SERVICES" | "MIXED"
  invoice_footer_text: string | null
  delivery_address_line1: string | null
  delivery_address_line2: string | null
  delivery_postal_code: string | null
  delivery_city: string | null
  delivery_country_code: string | null
}>

export type BillingKpiSnapshot = Readonly<{
  revenueIssuedCents: number
  outstandingCents: number
  quotesAwaitingDecision: number
}>
