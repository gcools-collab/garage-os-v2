import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  createElectronicInvoiceProvider,
  getElectronicInvoiceProvider,
  resetElectronicInvoiceProvider,
} from "../adapters/electronic-invoice-provider"
import { buildCanonicalStructuredInvoice } from "../builders/canonical-invoice-builder"
import { classifyFrenchRegulatoryRoute } from "../engines/french-regulatory-classifier"
import {
  computeDocumentTotals,
  computeLineTotals,
  computeRemainingCents,
  isDocumentEditable,
  isDocumentImmutable,
  parseEurosToCents,
} from "../engines/money-engine"

test("computeLineTotals rounds VAT deterministically", () => {
  const line = computeLineTotals(3, 3333, 2000, 0)
  assert.equal(line.lineTotalExclVatCents, 9999)
  assert.equal(line.vatAmountCents, 2000)
  assert.equal(line.lineTotalInclVatCents, 11999)
})

test("computeDocumentTotals aggregates multiple VAT rates", () => {
  const totals = computeDocumentTotals([
    { quantity: 1, unitPriceExclVatCents: 10_000, vatRateBps: 2000, discountBps: 0 },
    { quantity: 2, unitPriceExclVatCents: 5000, vatRateBps: 550, discountBps: 0 },
  ])
  assert.equal(totals.subtotalExclVatCents, 20_000)
  assert.equal(totals.vatByRate[2000], 2000)
  assert.equal(totals.vatByRate[550], 550)
  assert.equal(totals.totalInclVatCents, totals.subtotalExclVatCents + totals.totalVatCents)
})

test("computeRemainingCents subtracts payments and credit notes", () => {
  assert.equal(computeRemainingCents(12_000, 5_000, 2_000), 5_000)
  assert.equal(computeRemainingCents(12_000, 12_000, 0), 0)
})

test("parseEurosToCents accepts french decimal input", () => {
  assert.equal(parseEurosToCents("120,50"), 12_050)
  assert.equal(parseEurosToCents("0"), 0)
  assert.equal(parseEurosToCents("-1"), null)
})

test("draft documents are editable and issued documents are immutable", () => {
  assert.equal(isDocumentEditable("DRAFT"), true)
  assert.equal(isDocumentImmutable("ISSUED"), true)
  assert.equal(isDocumentImmutable("DRAFT"), false)
})

test("unconfigured electronic invoice provider never fakes success", async () => {
  resetElectronicInvoiceProvider()
  const provider = createElectronicInvoiceProvider({
    garage_id: "garage-1",
    provider_name: "B2BROUTER",
    provider_mode: "UNCONFIGURED",
    sandbox_account_id: null,
    production_account_id: null,
  })
  const document = {
    id: "doc-1",
    document_number: "FAC-2026-000001",
    document_type: "INVOICE",
    status: "ISSUED",
    customer_snapshot: { name: "Client" },
    issuer_snapshot: { siret: "12345678901234", vatNumber: "FR123", legalName: "Garage", addressLine1: "1 rue", postalCode: "75001", city: "Paris", countryCode: "FR" },
    subtotal_excl_vat_cents: 1000,
    total_vat_cents: 200,
    total_incl_vat_cents: 1200,
    amount_paid_cents: 0,
    amount_credited_cents: 0,
    currency: "EUR",
    electronic_status: "NOT_SUBMITTED",
  } as never
  const bundle = {
    document,
    lines: [{
      id: "l1", garage_id: "g1", document_id: "doc-1", line_order: 0, description: "Line", quantity: 1, unit: "u",
      unit_price_excl_vat_cents: 1000, vat_rate_bps: 2000, discount_bps: 0,
      line_total_excl_vat_cents: 1000, vat_amount_cents: 200, line_total_incl_vat_cents: 1200, service_offer_id: null, created_at: "2026-01-01",
    }],
    payments: [], events: [], linkedQuote: null, linkedInvoice: null, creditNotes: [],
  }
  const canonical = buildCanonicalStructuredInvoice(bundle, "SERVICES")
  const submission = await provider.submitInvoice({
    document,
    lines: bundle.lines,
    canonical,
    classification: classifyFrenchRegulatoryRoute({ recipientContext: "B2B_FR", transactionNature: "SERVICES", buyerSiren: "123456789" }),
  })
  assert.equal(submission.status, "NOT_SUBMITTED")
  assert.equal(submission.providerReference, null)
  assert.ok(submission.providerValidationErrors.length > 0)
})

test("getElectronicInvoiceProvider returns disabled adapter by default", () => {
  resetElectronicInvoiceProvider()
  assert.equal(getElectronicInvoiceProvider().mode, "DISABLED")
})

test("billing migration defines concurrency-safe numbering and immutability triggers", () => {
  const sql = readFileSync("supabase/migrations/20260828000054_create_billing_documents.sql", "utf8")
  assert.match(sql, /billing_document_sequences/)
  assert.match(sql, /allocate_billing_document_number/)
  assert.match(sql, /protect_issued_billing_document/)
  assert.match(sql, /prevent_billing_line_mutation_after_issue/)
  assert.match(sql, /convert_quote_to_invoice/)
  assert.match(sql, /on conflict \(garage_id, document_type, sequence_year\)/)
})

test("billing migration keeps invoice payments separate from PayPlug payments", () => {
  const sql = readFileSync("supabase/migrations/20260828000054_create_billing_documents.sql", "utf8")
  assert.match(sql, /invoice_payments/)
  assert.doesNotMatch(sql, /alter table public\.payments/)
})

test("fiscal settings migration is additive and tenant scoped", () => {
  const sql = readFileSync("supabase/migrations/20260828000053_create_garage_fiscal_settings.sql", "utf8")
  assert.match(sql, /garage_fiscal_settings/)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /siren/)
  assert.match(sql, /siret/)
})

test("billing payment RPC proves invoice tenant membership before mutation", () => {
  const sql = readFileSync("supabase/migrations/20260828000057_lock_down_verified_payment_rpc.sql", "utf8")
  const paymentWrapper = sql.slice(sql.indexOf("create function public.record_invoice_payment("))
  assert.match(paymentWrapper, /select d\.garage_id into invoice_garage_id[\s\S]*where d\.id = p_invoice_id/)
  assert.match(paymentWrapper, /invoice_garage_id is distinct from p_garage_id/)
  assert.match(paymentWrapper, /gm\.garage_id = invoice_garage_id and gm\.user_id = auth\.uid\(\)/)
  assert.match(paymentWrapper, /raise exception using errcode = '42501'/)
  assert.ok(paymentWrapper.indexOf("raise exception using errcode = '42501'") < paymentWrapper.indexOf("record_invoice_payment_internal("))
})

test("billing mutation wrappers block anon and isolate implementations", () => {
  const sql = readFileSync("supabase/migrations/20260828000057_lock_down_verified_payment_rpc.sql", "utf8")
  const mutations = ["create_billing_document_draft", "upsert_billing_document_line", "remove_billing_document_line", "finalize_billing_document", "convert_quote_to_invoice", "record_invoice_payment"] as const
  for (const mutation of mutations) {
    assert.match(sql, new RegExp(`revoke execute on function public\\.${mutation}\\([\\s\\S]*?from public, anon`, "i"))
    assert.match(sql, new RegExp(`grant execute on function public\\.${mutation}\\([\\s\\S]*?to authenticated`, "i"))
    assert.match(sql, new RegExp(`revoke all on function public\\.${mutation}_internal\\([\\s\\S]*?from public, anon, authenticated, service_role`, "i"))
  }
})

test("billing mutation wrappers require garage membership", () => {
  const sql = readFileSync("supabase/migrations/20260828000057_lock_down_verified_payment_rpc.sql", "utf8")
  const wrappers = sql.slice(sql.indexOf("create function public.create_billing_document_draft("))
  assert.equal((wrappers.match(/auth\.uid\(\) is null/g) ?? []).length, 6)
  assert.equal((wrappers.match(/public\.garage_members/g) ?? []).length, 6)
})
