import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type {
  BillingDocumentBundle,
  BillingDocumentRecord,
  BillingDocumentType,
  BillingKpiSnapshot,
  GarageFiscalSettingsRecord,
} from "../types/billing"
import type { GarageElectronicInvoiceSettingsRecord } from "../types/e-invoicing"

const DOCUMENT_COLUMNS = [
  "id", "garage_id", "document_type", "status", "document_number", "customer_id",
  "appointment_id", "registration_case_id", "customer_vehicle_id", "vehicle_id",
  "source_quote_id", "source_invoice_id", "converted_invoice_id",
  "issue_date", "due_date", "valid_until",
  "customer_snapshot", "issuer_snapshot", "vehicle_context",
  "subtotal_excl_vat_cents", "total_vat_cents", "total_incl_vat_cents",
  "amount_paid_cents", "amount_credited_cents", "currency",
  "credit_note_reason", "electronic_status", "electronic_provider_ref",
  "electronic_provider_metadata", "electronic_submission_errors",
  "transaction_nature", "recipient_context",
  "notes", "created_by", "created_at", "updated_at", "issued_at", "sent_at", "accepted_at",
].join(",")

function assertGarage(session: ActiveGarageSession): string {
  if (!session.garageId) throw new Error("GARAGE_SESSION_REQUIRED")
  return session.garageId
}

export async function listBillingDocuments(
  session: ActiveGarageSession,
  documentType: BillingDocumentType,
): Promise<readonly BillingDocumentRecord[]> {
  const garageId = assertGarage(session)
  const { data, error } = await (await createClient())
    .from("billing_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("garage_id", garageId)
    .eq("document_type", documentType)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as BillingDocumentRecord[]
}

export async function getBillingDocumentBundle(
  session: ActiveGarageSession,
  documentId: string,
): Promise<BillingDocumentBundle | null> {
  const garageId = assertGarage(session)
  const db = await createClient()

  const { data: document, error } = await db
    .from("billing_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("garage_id", garageId)
    .eq("id", documentId)
    .maybeSingle()

  if (error) throw error
  if (!document) return null

  const doc = document as unknown as BillingDocumentRecord

  const [linesRes, paymentsRes, eventsRes] = await Promise.all([
    db.from("billing_document_lines").select("*").eq("document_id", documentId).order("line_order"),
    doc.document_type === "INVOICE"
      ? db.from("invoice_payments").select("*").eq("invoice_id", documentId).order("paid_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    db.from("billing_document_events").select("*").eq("document_id", documentId).order("created_at", { ascending: false }),
  ])

  if (linesRes.error) throw linesRes.error
  if (paymentsRes.error) throw paymentsRes.error
  if (eventsRes.error) throw eventsRes.error

  let linkedQuote: BillingDocumentRecord | null = null
  let linkedInvoice: BillingDocumentRecord | null = null
  let creditNotes: BillingDocumentRecord[] = []

  if (doc.source_quote_id) {
    const { data } = await db.from("billing_documents").select(DOCUMENT_COLUMNS).eq("id", doc.source_quote_id).maybeSingle()
    linkedQuote = (data as unknown as BillingDocumentRecord | null) ?? null
  }
  if (doc.source_invoice_id) {
    const { data } = await db.from("billing_documents").select(DOCUMENT_COLUMNS).eq("id", doc.source_invoice_id).maybeSingle()
    linkedInvoice = (data as unknown as BillingDocumentRecord | null) ?? null
  }
  if (doc.document_type === "INVOICE") {
    const { data } = await db.from("billing_documents").select(DOCUMENT_COLUMNS).eq("source_invoice_id", doc.id).eq("document_type", "CREDIT_NOTE")
    creditNotes = (data ?? []) as unknown as BillingDocumentRecord[]
  }

  return {
    document: doc,
    lines: (linesRes.data ?? []) as unknown as BillingDocumentBundle["lines"],
    payments: (paymentsRes.data ?? []) as unknown as BillingDocumentBundle["payments"],
    events: (eventsRes.data ?? []) as unknown as BillingDocumentBundle["events"],
    linkedQuote,
    linkedInvoice,
    creditNotes,
  }
}

export async function getCustomerBillingDocuments(
  session: ActiveGarageSession,
  customerId: string,
): Promise<readonly BillingDocumentRecord[]> {
  const garageId = assertGarage(session)
  const { data, error } = await (await createClient())
    .from("billing_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("garage_id", garageId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as BillingDocumentRecord[]
}

export async function getGarageFiscalSettings(garageId: string): Promise<GarageFiscalSettingsRecord | null> {
  const { data, error } = await (await createClient())
    .from("garage_fiscal_settings")
    .select("*")
    .eq("garage_id", garageId)
    .maybeSingle()

  if (error) throw error
  return (data as unknown as GarageFiscalSettingsRecord | null) ?? null
}

export async function getGarageElectronicInvoiceSettings(
  garageId: string,
): Promise<GarageElectronicInvoiceSettingsRecord | null> {
  const { data, error } = await (await createClient())
    .from("garage_electronic_invoice_settings")
    .select("garage_id, provider_name, provider_mode, sandbox_account_id, production_account_id")
    .eq("garage_id", garageId)
    .maybeSingle()

  if (error) throw error
  return (data as unknown as GarageElectronicInvoiceSettingsRecord | null) ?? null
}

export async function getBillingKpiSnapshot(session: ActiveGarageSession): Promise<BillingKpiSnapshot> {
  const garageId = assertGarage(session)
  const { data, error } = await (await createClient())
    .from("billing_documents")
    .select("document_type, status, total_incl_vat_cents, amount_paid_cents, amount_credited_cents")
    .eq("garage_id", garageId)

  if (error) throw error
  const rows = data ?? []

  let revenueIssuedCents = 0
  let outstandingCents = 0
  let quotesAwaitingDecision = 0

  for (const row of rows) {
    if (row.document_type === "INVOICE" && ["ISSUED", "PARTIALLY_PAID", "PAID"].includes(row.status)) {
      revenueIssuedCents += row.total_incl_vat_cents ?? 0
      if (row.status !== "PAID") {
        outstandingCents += Math.max(0, (row.total_incl_vat_cents ?? 0) - (row.amount_paid_cents ?? 0) - (row.amount_credited_cents ?? 0))
      }
    }
    if (row.document_type === "QUOTE" && row.status === "SENT") {
      quotesAwaitingDecision += 1
    }
  }

  return { revenueIssuedCents, outstandingCents, quotesAwaitingDecision }
}

export async function getCustomerInvoicePayments(
  session: ActiveGarageSession,
  customerId: string,
): Promise<readonly { readonly payment: BillingDocumentBundle["payments"][number]; readonly invoice: BillingDocumentRecord }[]> {
  const documents = await getCustomerBillingDocuments(session, customerId)
  const invoices = documents.filter((item) => item.document_type === "INVOICE")
  if (invoices.length === 0) return []

  const db = await createClient()
  const invoiceIds = invoices.map((item) => item.id)
  const { data, error } = await db.from("invoice_payments").select("*").in("invoice_id", invoiceIds).order("paid_at", { ascending: false })
  if (error) throw error

  const byId = new Map(invoices.map((item) => [item.id, item]))
  return (data ?? []).flatMap((payment) => {
    const invoice = byId.get(payment.invoice_id)
    return invoice ? [{ payment, invoice }] : []
  })
}
