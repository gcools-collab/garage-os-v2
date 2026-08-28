import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PayPlugClient, getPayPlugConfig, validatePayPlugConfig } from "../providers/payplug/payplug-client"
import { PayPlugProvider } from "../providers/payplug/payplug-provider"
import { FakePaymentProvider } from "../providers/fake-payment-provider"
import { PaymentRetryEngine, PaymentVerificationEngine, verifyNotification } from "../engines/payment-engine"
import { buildPaymentDashboard } from "../builders/payment-builders"
import type { PaymentRecord, ProviderPayment } from "../types/payment"

const config = { enabled: true, mode: "test" as const, secretKey: "sk_test_x", apiUrl: "https://api.payplug.com", apiVersion: "2019-08-06" }
const trusted: ProviderPayment = { id: "pay_test", status: "PAID", amountCents: 3990, currency: "EUR", isLive: false, paymentUrl: "https://secure.payplug.com/pay/test", paidAt: "2026-08-14T10:00:00Z", expiresAt: null, metadata: { garage_os_payment_id: "p", appointment_id: "a", garage_id: "g" } }
const payment: PaymentRecord = { id: "p", garageId: "g", appointmentId: "a", provider: "PAYPLUG", providerPaymentId: "pay_test", status: "PENDING", amountCents: 3990, currency: "EUR", paymentStrategy: "FULL_PAYMENT", isLive: false, hostedPaymentUrl: trusted.paymentUrl, createdAt: "2026-08-14T09:00:00Z", paidAt: null, expiresAt: null, metadata: {} }

test("TEST sélectionne exclusivement PAYPLUG_TEST_KEY", () => {
  const resolved = getPayPlugConfig({ PAYPLUG_ENABLED: "true", PAYPLUG_MODE: "test", PAYPLUG_TEST_KEY: "sk_test_expected", PAYPLUG_LIVE_KEY: "sk_live_must_not_be_selected" })
  assert.equal(resolved.mode, "test")
  assert.equal(resolved.secretKey, "sk_test_expected")
  assert.doesNotThrow(() => validatePayPlugConfig(resolved))
})

test("TEST échoue fermé sans clé TEST et ne retombe jamais sur LIVE", () => {
  const resolved = getPayPlugConfig({ PAYPLUG_ENABLED: "true", PAYPLUG_MODE: "test", PAYPLUG_LIVE_KEY: "sk_live_only" })
  assert.equal(resolved.secretKey, "")
  assert.throws(() => validatePayPlugConfig(resolved), /PAYPLUG_TEST_KEY_MISSING/)
})

test("LIVE et un environnement ambigu sont bloqués avant construction du client", () => {
  assert.throws(() => getPayPlugConfig({ PAYPLUG_ENABLED: "true", PAYPLUG_MODE: "live", PAYPLUG_LIVE_KEY: "sk_live_x" }), /PAYPLUG_LIVE_DISABLED/)
  assert.throws(() => getPayPlugConfig({ PAYPLUG_ENABLED: "true", PAYPLUG_TEST_KEY: "sk_test_x" }), /PAYPLUG_MODE_REQUIRED/)
  assert.throws(() => validatePayPlugConfig({ ...config, secretKey: "sk_live_x" }), /PAYPLUG_TEST_KEY_INVALID/)
})

test("le client n’envoie que la clé TEST dans Authorization", async () => {
  let authorization = ""
  const fetcher: typeof fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get("Authorization") ?? ""
    return new Response("{}", { status: 200 })
  }
  await new PayPlugClient(config, fetcher).call("/v1/payments/pay_test")
  assert.equal(authorization, "Bearer sk_test_x")
  assert.doesNotMatch(authorization, /live/)
})

test("crée la Hosted Payment avec le montant serveur et les URLs de réconciliation", async () => {
  let body = ""
  const fetcher: typeof fetch = async (_input, init) => {
    body = String(init?.body)
    return new Response(JSON.stringify({ id: "pay_test", amount: 3990, currency: "EUR", is_live: false, is_paid: false, hosted_payment: { payment_url: trusted.paymentUrl }, metadata: trusted.metadata }), { status: 200 })
  }
  const provider = new PayPlugProvider(new PayPlugClient(config, fetcher))
  const result = await provider.createPayment({ amountCents: 3990, currency: "EUR", description: "Décalaminage -2L", customer: { firstName: "Jean", lastName: "Martin", email: "j@example.fr", phone: null }, returnUrl: "https://garage.fr/return", cancelUrl: "https://garage.fr/cancel", notificationUrl: "https://garage.fr/ipn", metadata: { garage_os_payment_id: "p", appointment_id: "a", garage_id: "g" } })
  assert.equal(result.paymentUrl, trusted.paymentUrl)
  assert.match(body, /"amount":3990/)
  assert.match(body, /"notification_url":"https:\/\/garage.fr\/ipn"/)
})

test("traduit les échecs PayPlug en statuts opérationnels sans faux succès", async () => {
  const response = (failure: string) => new PayPlugProvider(new PayPlugClient(config, async () => new Response(JSON.stringify({ id: "pay_test", amount: 3990, currency: "EUR", is_live: false, is_paid: false, failure: { code: failure }, metadata: trusted.metadata }), { status: 200 })))
  assert.equal((await response("timeout").retrievePayment("pay_test")).status, "EXPIRED")
  assert.equal((await response("canceled").retrievePayment("pay_test")).status, "CANCELLED")
  assert.equal((await response("card_declined").retrievePayment("pay_test")).status, "FAILED")
})

test("vérifie montant, devise, environnement et metadata", () => {
  const engine = new PaymentVerificationEngine()
  assert.equal(engine.verify(payment, trusted), true)
  assert.equal(engine.verify(payment, { ...trusted, amountCents: 3900 }), false)
  assert.equal(engine.verify(payment, { ...trusted, currency: "USD" }), false)
  assert.equal(engine.verify(payment, { ...trusted, isLive: true }), false)
  assert.equal(engine.verify(payment, { ...trusted, metadata: {} }), false)
})

test("la notification relit le paiement auprès du provider", async () => assert.equal((await verifyNotification(new FakePaymentProvider(trusted), payment, trusted.id)).valid, true))

test("retry et réutilisation sont déterministes", () => {
  const retry = new PaymentRetryEngine()
  assert.equal(retry.reuse(payment), true)
  assert.equal(retry.canRetry({ ...payment, status: "FAILED" }), true)
  assert.equal(retry.canRetry({ ...payment, status: "PAID" }), false)
})

test("le dashboard utilise seulement les paiements opérationnels reçus", () => {
  const summary = buildPaymentDashboard([{ ...payment, status: "PAID", paidAt: "2026-08-14T10:00:00Z" }], new Date("2026-08-14T12:00:00Z"))
  assert.equal(summary.receivedAmountToday, 3990)
})

test("la création est tenant-scopée, exclut l’historique et utilise le snapshot serveur", () => {
  const source = readFileSync("src/features/payments/actions/payment-actions.ts", "utf8")
  assert.match(source, /\.eq\("garage_id", garage\.id\)/)
  assert.match(source, /\.eq\("is_historical", false\)/)
  assert.match(source, /snapshot\?\.amount_due_now_cents/)
  assert.doesNotMatch(source, /formData\.get\("amount/)
  assert.match(source, /is_live: false/)
})

test("le webhook refuse une notification LIVE ou non-payment avant toute récupération", () => {
  const source = readFileSync("src/app/api/payments/payplug/notification/route.ts", "utf8")
  assert.match(source, /body\.object !== "payment"/)
  assert.match(source, /body\.is_live !== false/)
  assert.match(source, /retrievePayment/)
  assert.match(source, /outcome === "mismatch"/)
})

test("le retour navigateur ne confirme rien et ne révèle pas un autre tenant", () => {
  const source = readFileSync("src/app/(public)/g/[garageSlug]/payment/return/page.tsx", "utf8")
  assert.doesNotMatch(source, /update\(|applyVerifiedProviderPayment|apply_verified_payment/)
  assert.match(source, /\.eq\("live_slug", garageSlug/)
  assert.match(source, /\.eq\("garage_id", garage\.id\)/)
  assert.match(source, /vérification serveur/)
})

test("les paiements SAP restent dans historical_payments sans provider opérationnel", () => {
  const migration = readFileSync("supabase/migrations/20260825000050_create_controlled_import_execution.sql", "utf8")
  assert.match(migration, /target='historical_payments'/)
  assert.match(migration, /insert into public\.historical_payments/)
  assert.doesNotMatch(migration, /kind='HISTORICAL_PAYMENT'[\s\S]{0,500}insert into public\.payments/)
})

test("la migration locale prépare unicité, service_role et notifications compatibles", () => {
  const sql = readFileSync("supabase/migrations/20260827000056_harden_payplug_test_acceptance.sql", "utf8")
  assert.match(sql, /payments_one_active_per_appointment/)
  assert.match(sql, /where status in \('CREATED', 'PENDING', 'PAID'\)/)
  assert.match(sql, /grant execute[\s\S]*to service_role/)
  assert.match(sql, /'appointment', 'registration_case', 'payment'/)
})

test("migration 57 restricts verified reconciliation to service_role", () => {
  const sql = readFileSync("supabase/migrations/20260828000057_lock_down_verified_payment_rpc.sql", "utf8")
  const applyBlock = sql.slice(0, sql.indexOf("alter function public.create_billing_document_draft"))
  assert.match(applyBlock, /revoke execute on function public\.apply_verified_payment[\s\S]*from public, anon, authenticated/i)
  assert.match(applyBlock, /grant execute on function public\.apply_verified_payment[\s\S]*to service_role/i)
})
