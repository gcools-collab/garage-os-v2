import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { calculateRegistrationProgress, canTransitionRegistrationCase } from "../engines/registration-case-engine"
import { buildPublicPaymentResume } from "../builders/registration-case-builder"
import { registrationFileSchema } from "../validation/registration-validation"
const requirement = (status: "MISSING" | "UPLOADED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED", isRequired = true) => ({ id: crypto.randomUUID(), requirementKey: "IDENTITY", label: "Identité", description: null, isRequired, displayOrder: 0, status } as const)
test("le lifecycle refuse les transitions arbitraires", () => { assert.equal(canTransitionRegistrationCase("NEW", "WAITING_FOR_DOCUMENTS"), true); assert.equal(canTransitionRegistrationCase("NEW", "COMPLETED"), false) })
test("la progression distingue transmission et vérification", () => { const value = calculateRegistrationProgress([requirement("ACCEPTED"), requirement("UPLOADED"), requirement("MISSING"), requirement("MISSING", false)]); assert.equal(value.transmittedPercent, 67); assert.equal(value.acceptedPercent, 33); assert.equal(value.isComplete, false) })
test("un dossier sans pièce obligatoire est complet", () => assert.equal(calculateRegistrationProgress([requirement("MISSING", false)]).isComplete, true))
test("les fichiers sont bornés par MIME et taille", () => {
  assert.equal(registrationFileSchema.safeParse({ name: "piece.pdf", size: 1024, type: "application/pdf" }).success, true)
  assert.equal(registrationFileSchema.safeParse({ name: "virus.exe", size: 1024, type: "application/octet-stream" }).success, false)
})
test("la migration staff permet un dossier carte grise sans rendez-vous", () => {
  const migration = readFileSync("supabase/migrations/20260827000052_staff_appointment_registration.sql", "utf8")
  assert.match(migration, /create_staff_registration_case/)
  assert.match(migration, /p_appointment_id uuid default null/)
  assert.match(migration, /registration_case_requirements/)
})

test("l'action staff de dossier vérifie le tenant et redirige", () => {
  const source = readFileSync("src/features/registration/actions/registration-actions.ts", "utf8")
  assert.match(source, /create_staff_registration_case/)
  assert.match(source, /session\.garageId/)
  assert.match(source, /redirect\(`\/registration\//)
})

const payableAppointment = { id: "appointment-1", status: "AWAITING_PAYMENT", isHistorical: false, commercialSnapshot: { payment_strategy: "DEPOSIT", amount_due_now_cents: 2000, currency: "EUR" } } as const

test("le portail propose la reprise d'un acompte attendu avec montant serveur", () => {
  const resume = buildPublicPaymentResume(payableAppointment, null)
  assert.equal(resume?.amountCents, 2000)
  assert.match(resume?.label ?? "", /20,00/)
  const page = readFileSync("src/app/(public)/g/[garageSlug]/registration/[publicToken]/page.tsx", "utf8")
  assert.match(page, /portal\.paymentResume\?<PublicRegistrationPaymentResume/)
})

test("le portail bloque les rendez-vous historiques et les paiements déjà reçus", () => {
  assert.equal(buildPublicPaymentResume({ ...payableAppointment, isHistorical: true }, null), null)
  assert.equal(buildPublicPaymentResume(payableAppointment, { status: "PAID", amountCents: 2000, currency: "EUR" }), null)
})

test("le portail bloque les statuts et snapshots non payables", () => {
  assert.equal(buildPublicPaymentResume({ ...payableAppointment, status: "CONFIRMED" }, null), null)
  assert.equal(buildPublicPaymentResume({ ...payableAppointment, commercialSnapshot: null }, null), null)
})

test("la reprise revalide le token et dérive le rendez-vous côté serveur", () => {
  const source = readFileSync("src/features/registration/actions/public-registration-actions.ts", "utf8")
  const portalStorage = readFileSync("src/features/registration/storage/registration-storage.ts", "utf8")
  assert.match(source, /getPublicRegistrationPortal\(garageSlug, token\)/)
  assert.match(source, /createAppointmentPayment\(String\(portal\.appointment\.id\), garageSlug\)/)
  assert.doesNotMatch(source, /formData\.get\("appointmentId"\)/)
  assert.doesNotMatch(source, /bookPublicAppointment|createPublicCustomerRequest/)
  assert.match(portalStorage, /\^\[a-f0-9\]\{64\}\$/)
  assert.match(portalStorage, /public_token_hash",tokenHash\(token\)/)
  assert.match(portalStorage, /\.eq\("garage_id",garage\.id\)/)
})

test("la reprise conserve les protections d'idempotence, de montant et de mode TEST", () => {
  const paymentAction = readFileSync("src/features/payments/actions/payment-actions.ts", "utf8")
  const payplugConfig = readFileSync("src/features/payments/providers/payplug/payplug-client.ts", "utf8")
  const uniqueness = readFileSync("supabase/migrations/20260827000056_harden_payplug_test_acceptance.sql", "utf8")
  assert.match(paymentAction, /snapshot\?\.amount_due_now_cents/)
  assert.match(paymentAction, /existing\.data\?\.hosted_payment_url/)
  assert.match(paymentAction, /is_live: false/)
  assert.match(uniqueness, /payments_one_active_per_appointment/)
  assert.match(payplugConfig, /requestedMode !== "test"/)
  assert.match(payplugConfig, /PAYPLUG_LIVE_DISABLED/)
})
