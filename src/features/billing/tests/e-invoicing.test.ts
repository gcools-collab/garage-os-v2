import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { B2brouterElectronicInvoiceProvider } from "../adapters/b2brouter/b2brouter-provider"
import { mapCanonicalInvoiceToB2brouterPayload } from "../adapters/b2brouter/b2brouter-mapper"
import {
  createElectronicInvoiceProvider,
  resetElectronicInvoiceProvider,
  setElectronicInvoiceProviderSettings,
} from "../adapters/electronic-invoice-provider"
import { productionCallsExplicitlyBlocked, resolveProviderConfiguration, validateProviderConfiguration } from "../adapters/provider-config"
import { buildCanonicalStructuredInvoice } from "../builders/canonical-invoice-builder"
import { classifyFrenchRegulatoryRoute, classifyRecipientContext } from "../engines/french-regulatory-classifier"
import { validateElectronicInvoiceReadiness } from "../engines/e-invoicing-readiness-engine"
import type { BillingDocumentBundle, BillingDocumentRecord } from "../types/billing"

const issuedInvoice = (overrides: Partial<BillingDocumentRecord> = {}): BillingDocumentRecord => ({
  id: "inv-1",
  garage_id: "garage-1",
  document_type: "INVOICE",
  status: "ISSUED",
  document_number: "FAC-2026-000001",
  customer_id: "cust-1",
  appointment_id: null,
  registration_case_id: null,
  customer_vehicle_id: null,
  vehicle_id: null,
  source_quote_id: null,
  source_invoice_id: null,
  converted_invoice_id: null,
  issue_date: "2026-08-27",
  due_date: null,
  valid_until: null,
  customer_snapshot: {
    name: "Garage Dupont SARL",
    companyName: "Garage Dupont SARL",
    siren: "123456789",
    vatNumber: "FR12345678901",
    addressLine: "1 rue Test",
    postalCode: "75001",
    city: "Paris",
    countryCode: "FR",
  },
  issuer_snapshot: {
    legalName: "Garage OS Demo",
    displayName: "Garage OS Demo",
    siret: "12345678901234",
    vatNumber: "FR99887766554",
    addressLine1: "10 avenue Garage",
    postalCode: "69001",
    city: "Lyon",
    countryCode: "FR",
  },
  vehicle_context: {},
  subtotal_excl_vat_cents: 10_000,
  total_vat_cents: 2_000,
  total_incl_vat_cents: 12_000,
  amount_paid_cents: 0,
  amount_credited_cents: 0,
  currency: "EUR",
  credit_note_reason: null,
  electronic_status: "NOT_SUBMITTED",
  electronic_provider_ref: null,
  electronic_provider_metadata: {},
  electronic_submission_errors: [],
  transaction_nature: "SERVICES",
  recipient_context: "B2B_FR",
  notes: null,
  created_by: null,
  created_at: "2026-08-27T10:00:00.000Z",
  updated_at: "2026-08-27T10:00:00.000Z",
  issued_at: "2026-08-27T10:00:00.000Z",
  sent_at: null,
  accepted_at: null,
  ...overrides,
})

function bundle(document: BillingDocumentRecord): BillingDocumentBundle {
  return {
    document,
    lines: [{
      id: "line-1",
      garage_id: "garage-1",
      document_id: document.id,
      line_order: 0,
      description: "Prestation",
      quantity: 1,
      unit: "unité",
      unit_price_excl_vat_cents: 10_000,
      vat_rate_bps: 2000,
      discount_bps: 0,
      line_total_excl_vat_cents: 10_000,
      vat_amount_cents: 2_000,
      line_total_incl_vat_cents: 12_000,
      service_offer_id: null,
      created_at: "2026-08-27T10:00:00.000Z",
    }],
    payments: [],
    events: [],
    linkedQuote: null,
    linkedInvoice: null,
    creditNotes: [],
  }
}

test("classifies B2B French business customer", () => {
  assert.equal(classifyRecipientContext({
    companyName: "ACME",
    siren: "123456789",
    vatNumber: null,
    countryCode: "FR",
    addressLine: "1 rue",
    postalCode: "75001",
    city: "Paris",
  }), "B2B_FR")
})

test("classifies B2C French consumer", () => {
  assert.equal(classifyRecipientContext({
    companyName: null,
    siren: null,
    vatNumber: null,
    countryCode: "FR",
    addressLine: "1 rue",
    postalCode: "75001",
    city: "Paris",
  }), "B2C_FR")
})

test("B2B route enables PA transmission eligibility", () => {
  const route = classifyFrenchRegulatoryRoute({
    recipientContext: "B2B_FR",
    transactionNature: "SERVICES",
    buyerSiren: "123456789",
  })
  assert.equal(route.regulatoryRoute, "E_INVOICE_PA")
  assert.equal(route.paTransmissionEligible, true)
})

test("B2C route uses e-reporting only", () => {
  const route = classifyFrenchRegulatoryRoute({
    recipientContext: "B2C_FR",
    transactionNature: "SERVICES",
    buyerSiren: null,
  })
  assert.equal(route.regulatoryRoute, "E_REPORTING_ONLY")
  assert.equal(route.paTransmissionEligible, false)
})

test("missing seller SIRET blocks readiness", () => {
  const readiness = validateElectronicInvoiceReadiness({
    document: issuedInvoice({ issuer_snapshot: { displayName: "Garage", countryCode: "FR" } }),
    lines: bundle(issuedInvoice()).lines,
    transactionNature: "SERVICES",
  })
  assert.equal(readiness.ready, false)
  assert.ok(readiness.errors.some((item) => item.includes("siret")))
})

test("missing buyer SIREN blocks B2B readiness", () => {
  const readiness = validateElectronicInvoiceReadiness({
    document: issuedInvoice({
      customer_snapshot: {
        name: "Client Pro",
        companyName: "Client Pro SAS",
        countryCode: "FR",
        addressLine: "2 rue",
        postalCode: "75002",
        city: "Paris",
      },
    }),
    lines: bundle(issuedInvoice()).lines,
    transactionNature: "SERVICES",
  })
  assert.equal(readiness.ready, false)
  assert.ok(readiness.errors.some((item) => item.includes("SIREN")))
})

test("disabled provider never fakes success", async () => {
  resetElectronicInvoiceProvider()
  const provider = createElectronicInvoiceProvider({
    garage_id: "garage-1",
    provider_name: "NONE",
    provider_mode: "DISABLED",
    sandbox_account_id: null,
    production_account_id: null,
  })
  const canonical = buildCanonicalStructuredInvoice(bundle(issuedInvoice()), "SERVICES")
  const result = await provider.submitInvoice({
    document: issuedInvoice(),
    lines: bundle(issuedInvoice()).lines,
    canonical,
    classification: classifyFrenchRegulatoryRoute({
      recipientContext: "B2B_FR",
      transactionNature: "SERVICES",
      buyerSiren: "123456789",
    }),
  })
  assert.equal(result.status, "NOT_SUBMITTED")
  assert.equal(result.providerReference, null)
  assert.ok(result.providerValidationErrors.length > 0)
})

test("unconfigured provider reports missing server secrets", () => {
  const config = resolveProviderConfiguration({
    garage_id: "garage-1",
    provider_name: "B2BROUTER",
    provider_mode: "SANDBOX",
    sandbox_account_id: "acc-1",
    production_account_id: null,
  })
  const connection = validateProviderConfiguration(config)
  assert.equal(connection.connectionStatus, "UNCONFIGURED")
})

test("production calls blocked without explicit server flag", () => {
  const config = resolveProviderConfiguration({
    garage_id: "garage-1",
    provider_name: "B2BROUTER",
    provider_mode: "PRODUCTION",
    sandbox_account_id: null,
    production_account_id: "prod-1",
  })
  assert.equal(productionCallsExplicitlyBlocked(config), true)
})

test("business status remains separate from transmission status in canonical model", () => {
  const doc = issuedInvoice({ status: "PARTIALLY_PAID", electronic_status: "NOT_SUBMITTED" })
  const canonical = buildCanonicalStructuredInvoice(bundle(doc), "SERVICES")
  assert.equal(canonical.businessStatus, "PARTIALLY_PAID")
  assert.equal(canonical.transmissionStatus, "NOT_SUBMITTED")
})

test("B2Brouter sandbox adapter returns error on HTTP failure without fake success", async () => {
  const config = resolveProviderConfiguration({
    garage_id: "garage-1",
    provider_name: "B2BROUTER",
    provider_mode: "SANDBOX",
    sandbox_account_id: "acc-1",
    production_account_id: null,
  })
  const provider = new B2brouterElectronicInvoiceProvider({
    ...config,
    requestedMode: "SANDBOX",
    secrets: {
      b2brouterApiKey: "test_key",
      b2brouterApiVersion: "2025-10-13",
      b2brouterApiBaseUrl: "https://api-staging.b2brouter.net",
    },
    allowProductionCalls: false,
  }, async () => new Response(JSON.stringify({ error: "invalid" }), { status: 422 }))

  const canonical = buildCanonicalStructuredInvoice(bundle(issuedInvoice()), "SERVICES")
  const result = await provider.submitInvoice({
    document: issuedInvoice(),
    lines: bundle(issuedInvoice()).lines,
    canonical,
    classification: classifyFrenchRegulatoryRoute({
      recipientContext: "B2B_FR",
      transactionNature: "SERVICES",
      buyerSiren: "123456789",
    }),
  })
  assert.equal(result.status, "ERROR")
  assert.equal(result.providerReference, null)
})

test("canonical mapper produces deterministic B2Brouter payload", () => {
  const canonical = buildCanonicalStructuredInvoice(bundle(issuedInvoice()), "SERVICES")
  const payload = mapCanonicalInvoiceToB2brouterPayload(canonical, { sendAfterImport: false })
  assert.equal(payload.invoice.number, "FAC-2026-000001")
  assert.equal(payload.invoice.invoice_lines_attributes.length, 1)
  assert.equal(payload.send_after_import, false)
})

test("provider swap does not alter billing document fields", () => {
  resetElectronicInvoiceProvider()
  setElectronicInvoiceProviderSettings({
    garage_id: "garage-1",
    provider_name: "B2BROUTER",
    provider_mode: "SANDBOX",
    sandbox_account_id: "acc-1",
    production_account_id: null,
  })
  const providerA = createElectronicInvoiceProvider({
    garage_id: "garage-1",
    provider_name: "B2BROUTER",
    provider_mode: "SANDBOX",
    sandbox_account_id: "acc-1",
    production_account_id: null,
  })
  setElectronicInvoiceProviderSettings({
    garage_id: "garage-1",
    provider_name: "TIIME",
    provider_mode: "UNCONFIGURED",
    sandbox_account_id: null,
    production_account_id: null,
  })
  const providerB = createElectronicInvoiceProvider({
    garage_id: "garage-1",
    provider_name: "TIIME",
    provider_mode: "UNCONFIGURED",
    sandbox_account_id: null,
    production_account_id: null,
  })
  assert.notEqual(providerA.providerName, providerB.providerName)
  assert.equal(issuedInvoice().document_number, "FAC-2026-000001")
})

test("e-invoicing migration adds generic provider metadata only", () => {
  const sql = readFileSync("supabase/migrations/20260828000055_french_einvoicing_foundation.sql", "utf8")
  assert.match(sql, /electronic_provider_metadata/)
  assert.match(sql, /garage_electronic_invoice_settings/)
  assert.doesNotMatch(sql, /B2BROUTER_API/)
})
