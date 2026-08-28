"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import { parseEurosToCents } from "../engines/money-engine"
import type { BillingDocumentType, InvoicePaymentMethod } from "../types/billing"

const UUID = /^[0-9a-f-]{36}$/i

export async function createBillingDocumentDraft(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const documentType = String(formData.get("documentType") ?? "") as BillingDocumentType
  const customerId = String(formData.get("customerId") ?? "")
  if (!UUID.test(customerId)) return
  if (!["QUOTE", "INVOICE", "CREDIT_NOTE"].includes(documentType)) return

  const appointmentId = String(formData.get("appointmentId") ?? "")
  const registrationCaseId = String(formData.get("registrationCaseId") ?? "")
  const sourceInvoiceId = String(formData.get("sourceInvoiceId") ?? "")

  const db = await createClient()
  const { data, error } = await db.rpc("create_billing_document_draft", {
    p_garage_id: session.garageId,
    p_document_type: documentType,
    p_customer_id: customerId,
    p_appointment_id: UUID.test(appointmentId) ? appointmentId : null,
    p_registration_case_id: UUID.test(registrationCaseId) ? registrationCaseId : null,
    p_customer_vehicle_id: null,
    p_vehicle_id: null,
    p_source_invoice_id: UUID.test(sourceInvoiceId) ? sourceInvoiceId : null,
    p_valid_until: String(formData.get("validUntil") ?? "") || null,
    p_notes: String(formData.get("notes") ?? "") || null,
  })

  if (error || !data) return
  revalidatePath("/billing")
  revalidatePath(`/customers/${customerId}`)
  redirect(`/billing/${documentType === "QUOTE" ? "quotes" : documentType === "INVOICE" ? "invoices" : "credit-notes"}/${data}`)
}

export async function saveBillingDocumentLine(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const documentId = String(formData.get("documentId") ?? "")
  const lineId = String(formData.get("lineId") ?? "")
  if (!UUID.test(documentId)) return

  const unitPrice = parseEurosToCents(String(formData.get("unitPrice") ?? ""))
  if (unitPrice === null) return

  const quantity = Number(formData.get("quantity") ?? 1)
  const vatRatePercent = Number(formData.get("vatRatePercent") ?? 20)
  const vatRateBps = Math.round(vatRatePercent * 100)
  const serviceOfferId = String(formData.get("serviceOfferId") ?? "")

  const db = await createClient()
  const { error } = await db.rpc("upsert_billing_document_line", {
    p_garage_id: session.garageId,
    p_document_id: documentId,
    p_line_id: UUID.test(lineId) ? lineId : null,
    p_line_order: Number(formData.get("lineOrder") ?? 0),
    p_description: String(formData.get("description") ?? ""),
    p_quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
    p_unit: String(formData.get("unit") ?? "unité"),
    p_unit_price_excl_vat_cents: unitPrice,
    p_vat_rate_bps: vatRateBps,
    p_discount_bps: 0,
    p_service_offer_id: UUID.test(serviceOfferId) ? serviceOfferId : null,
  })

  if (error) return
  revalidateBilling(documentId)
}

export async function removeBillingDocumentLine(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const documentId = String(formData.get("documentId") ?? "")
  const lineId = String(formData.get("lineId") ?? "")
  if (!UUID.test(documentId) || !UUID.test(lineId)) return

  const db = await createClient()
  await db.rpc("remove_billing_document_line", {
    p_garage_id: session.garageId,
    p_document_id: documentId,
    p_line_id: lineId,
  })
  revalidateBilling(documentId)
}

export async function finalizeBillingDocument(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const documentId = String(formData.get("documentId") ?? "")
  const action = String(formData.get("action") ?? "")
  if (!UUID.test(documentId)) return

  const db = await createClient()
  const { data, error } = await db.rpc("finalize_billing_document", {
    p_garage_id: session.garageId,
    p_document_id: documentId,
    p_action: action,
  })

  if (error || !data) return
  revalidateBilling(documentId)
}

export async function convertQuoteToInvoice(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const quoteId = String(formData.get("quoteId") ?? "")
  if (!UUID.test(quoteId)) return

  const db = await createClient()
  const { data, error } = await db.rpc("convert_quote_to_invoice", {
    p_garage_id: session.garageId,
    p_quote_id: quoteId,
  })

  if (error || !data) return
  revalidatePath("/billing/quotes")
  revalidatePath(`/billing/quotes/${quoteId}`)
  redirect(`/billing/invoices/${data}`)
}

export async function recordInvoicePayment(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const invoiceId = String(formData.get("invoiceId") ?? "")
  const amount = parseEurosToCents(String(formData.get("amount") ?? ""))
  const method = String(formData.get("paymentMethod") ?? "OTHER") as InvoicePaymentMethod
  if (!UUID.test(invoiceId) || amount === null || amount <= 0) return

  const db = await createClient()
  const { error } = await db.rpc("record_invoice_payment", {
    p_garage_id: session.garageId,
    p_invoice_id: invoiceId,
    p_amount_cents: amount,
    p_payment_method: method,
    p_paid_at: new Date().toISOString(),
    p_reference: String(formData.get("reference") ?? "") || null,
    p_notes: String(formData.get("notes") ?? "") || null,
  })

  if (error) return
  revalidateBilling(invoiceId)
}

export async function addServiceOfferLine(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const documentId = String(formData.get("documentId") ?? "")
  const offerId = String(formData.get("offerId") ?? "")
  if (!UUID.test(documentId) || !UUID.test(offerId)) return

  const db = await createClient()
  const { data: offer } = await db
    .from("service_offers")
    .select("id, name, amount_cents, currency")
    .eq("garage_id", session.garageId)
    .eq("id", offerId)
    .maybeSingle()

  if (!offer?.amount_cents) return

  const { data: fiscal } = await db
    .from("garage_fiscal_settings")
    .select("default_vat_rate_bps")
    .eq("garage_id", session.garageId)
    .maybeSingle()

  const { count } = await db
    .from("billing_document_lines")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)

  await db.rpc("upsert_billing_document_line", {
    p_garage_id: session.garageId,
    p_document_id: documentId,
    p_line_id: null,
    p_line_order: count ?? 0,
    p_description: offer.name,
    p_quantity: 1,
    p_unit: "unité",
    p_unit_price_excl_vat_cents: offer.amount_cents,
    p_vat_rate_bps: fiscal?.default_vat_rate_bps ?? 2000,
    p_discount_bps: 0,
    p_service_offer_id: offer.id,
  })

  revalidateBilling(documentId)
}

function revalidateBilling(documentId: string): void {
  revalidatePath("/billing")
  revalidatePath("/billing/quotes")
  revalidatePath("/billing/invoices")
  revalidatePath("/billing/credit-notes")
  revalidatePath(`/billing/quotes/${documentId}`)
  revalidatePath(`/billing/invoices/${documentId}`)
  revalidatePath(`/billing/credit-notes/${documentId}`)
  revalidatePath("/customers")
  revalidatePath("/dashboard")
}
