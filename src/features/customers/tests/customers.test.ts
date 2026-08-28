import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildCustomerDetailViewModel, buildCustomerListItems } from "../builders/customer-view-models"
import {
  buildCustomerSummaryMetrics,
  buildCustomerTimeline,
  filterTimelineEvents,
  isHistoricalPaymentSuccessful,
} from "../engine/customer-timeline-engine"
import { formatCustomerName, normalizeEmail, normalizeFrenchPhone, normalizeSearchQuery } from "../normalization"
import type { Customer360Bundle } from "../repositories/customer-repository"

const customer = {
  id: "cust-1",
  garage_id: "garage-1",
  first_name: "Jean",
  last_name: "Martin",
  email: "jean@example.fr",
  normalized_email: "jean@example.fr",
  phone: "0600000000",
  normalized_phone: "+33600000000",
  address_line: null,
  postal_code: null,
  city: null,
  source: "WORDPRESS" as const,
  external_id: "wp-1",
  notes: null,
  created_at: "2024-01-01T10:00:00.000Z",
  updated_at: "2024-06-01T10:00:00.000Z",
}

function emptyBundle(overrides: Partial<Customer360Bundle> = {}): Customer360Bundle {
  return {
    customer,
    vehicles: [],
    leads: [],
    leadEvents: [],
    leadNotes: [],
    commercialTasks: [],
    appointments: [],
    appointmentEvents: [],
    registrationCases: [],
    registrationEvents: [],
    historicalPayments: [],
    livePayments: [],
    billingDocuments: [],
    ...overrides,
  }
}

test("normalizes email and french phone consistently", () => {
  assert.equal(normalizeEmail(" Jean@Example.FR "), "jean@example.fr")
  assert.equal(normalizeFrenchPhone("06 00 00 00 00"), "+33600000000")
  assert.equal(formatCustomerName("Jean", "Martin"), "Jean Martin")
  assert.equal(normalizeSearchQuery("  dup,,test  "), "dup test")
})

test("timeline orders newest first and labels imported history", () => {
  const timeline = buildCustomerTimeline(emptyBundle({
    leads: [{
      id: "lead-1",
      garage_id: "garage-1",
      vehicle_id: null,
      customer_id: "cust-1",
      source: "MANUAL",
      type: "GENERAL_CONTACT",
      status: "NEW",
      customer_name: "Jean Martin",
      customer_phone: null,
      customer_email: null,
      message: "Bonjour",
      vehicle_title_snapshot: null,
      legacy_source: "WORDPRESS",
      created_at: "2025-01-02T10:00:00.000Z",
      updated_at: "2025-01-02T10:00:00.000Z",
      first_contacted_at: null,
      last_contacted_at: null,
      next_action_at: null,
    } as never],
    appointments: [{
      id: "appt-1",
      garage_id: "garage-1",
      lead_id: null,
      vehicle_id: null,
      customer_id: "cust-1",
      type: "TEST_DRIVE",
      status: "COMPLETED",
      starts_at: "2025-02-01T10:00:00.000Z",
      ends_at: "2025-02-01T10:30:00.000Z",
      timezone: "Europe/Paris",
      customer_name: "Jean Martin",
      customer_phone: null,
      customer_email: null,
      is_historical: true,
      payment_required: false,
      details: {},
      created_at: "2025-02-01T09:00:00.000Z",
    }],
  }))

  assert.ok(timeline.length >= 3)
  assert.ok(Date.parse(timeline[0].occurredAt) >= Date.parse(timeline[1].occurredAt))
  assert.equal(timeline.some((item) => item.isImported && item.domainLabel === "Historique importé"), true)
})

test("anonymous appointments without customer_id never appear in customer bundle queries", () => {
  const source = readFileSync("src/features/customers/repositories/customer-repository.ts", "utf8")
  assert.match(source, /\.eq\("customer_id", customerId\)/)
  assert.doesNotMatch(source, /customer_name\.eq/)
})

test("historical payments stay read-only and exclude refunded amounts from KPIs", () => {
  assert.equal(isHistoricalPaymentSuccessful("completed"), true)
  assert.equal(isHistoricalPaymentSuccessful("refunded"), false)

  const metrics = buildCustomerSummaryMetrics(emptyBundle({
    historicalPayments: [
      { id: "hp-1", garage_id: "garage-1", customer_id: "cust-1", source: "WOOCOMMERCE", external_order_id: "100", amount_cents: 5000, currency: "EUR", source_status: "completed", occurred_at: "2024-05-01T00:00:00.000Z", created_at: "2024-05-01T00:00:00.000Z" },
      { id: "hp-2", garage_id: "garage-1", customer_id: "cust-1", source: "WOOCOMMERCE", external_order_id: "101", amount_cents: 3000, currency: "EUR", source_status: "refunded", occurred_at: "2024-05-02T00:00:00.000Z", created_at: "2024-05-02T00:00:00.000Z" },
    ],
  }))

  assert.equal(metrics.historicalPaidCents, 5000)
})

test("customer actions enforce garage session and tenant boundaries", () => {
  const source = readFileSync("src/features/customers/actions/customer-actions.ts", "utf8")
  assert.match(source, /getActiveGarageSession/)
  assert.match(source, /eq\("garage_id", session\.garageId\)/)
  assert.match(source, /findDuplicateCustomers/)
  assert.doesNotMatch(source, /service_role|createPaymentAdminClient|apply_verified_payment/)
})

test("directory and detail builders expose useful French summaries", () => {
  const list = buildCustomerListItems([customer], {
    "cust-1": { vehicleCount: 2, lastInteractionAt: "2025-01-01T00:00:00.000Z", nextAppointmentAt: null, nextAppointmentLabel: null },
  })
  assert.equal(list[0].name, "Jean Martin")
  assert.match(list[0].vehicleCountLabel, /2 véhicules/)

  const view = buildCustomerDetailViewModel(emptyBundle())
  assert.equal(view.name, "Jean Martin")
  assert.equal(view.sourceLabel, "Historique importé")
})

test("timeline filter keeps categories isolated", () => {
  const timeline = buildCustomerTimeline(emptyBundle({
    historicalPayments: [{
      id: "hp-1",
      garage_id: "garage-1",
      customer_id: "cust-1",
      source: "WOOCOMMERCE",
      external_order_id: "100",
      amount_cents: 1000,
      currency: "EUR",
      source_status: "completed",
      occurred_at: "2024-05-01T00:00:00.000Z",
      created_at: "2024-05-01T00:00:00.000Z",
    }],
  }))
  const payments = filterTimelineEvents(timeline, "PAYMENT")
  assert.equal(payments.every((item) => item.category === "PAYMENT"), true)
})

test("long lead messages are truncated in detail view without breaking layout contract", () => {
  const longMessage = "A".repeat(400)
  const view = buildCustomerDetailViewModel(emptyBundle({
    leads: [{
      id: "lead-1",
      garage_id: "garage-1",
      vehicle_id: null,
      customer_id: "cust-1",
      source: "MANUAL",
      type: "GENERAL_CONTACT",
      status: "NEW",
      customer_name: "Jean Martin",
      customer_phone: null,
      customer_email: null,
      message: longMessage,
      vehicle_title_snapshot: null,
      legacy_source: null,
      created_at: "2025-01-02T10:00:00.000Z",
      updated_at: "2025-01-02T10:00:00.000Z",
      first_contacted_at: null,
      last_contacted_at: null,
      next_action_at: null,
    } as never],
  }))
  assert.ok(view.leads[0].messagePreview?.endsWith("…"))
  assert.ok((view.leads[0].messagePreview?.length ?? 0) <= 241)
})

test("customer foundation migration defines tenant indexes and RLS", () => {
  const migration = readFileSync("supabase/migrations/20260817000048_create_customer_foundation.sql", "utf8")
  assert.match(migration, /customers_garage_email_unique/)
  assert.match(migration, /Garage members read customers/)
  assert.match(migration, /appointments_customer_idx/)
})
