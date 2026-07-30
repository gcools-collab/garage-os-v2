import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import {
  buildLeadDashboardSummary,
  buildLeadDetail,
  buildLeadListItems,
} from "./builders"
import { LeadList } from "./components/LeadList"
import {
  buildEmailHref,
  buildLeadVehicleSnapshot,
  buildTelephoneHref,
  canManageLead,
  canTransitionLeadStatus,
  computeLeadPriority,
  guardLeadSubmission,
} from "./engine"
import { buildVehicleLeadContactActions } from "./presentation"
import type { LeadRecord, PublicLeadInput, ValidatedPublicLeadInput } from "./types"
import {
  normalizePhone,
  parsePublicLeadInput,
  validateLeadContactability,
  validatePublicLead,
} from "./validation"

function input(overrides: Partial<PublicLeadInput> = {}): PublicLeadInput {
  return {
    garageSlug: "garage-a",
    vehicleSlug: "peugeot-308-aaaaaaaa",
    type: "APPOINTMENT_REQUEST",
    customerName: "Marie Martin",
    customerPhone: "06 12 34 56 78",
    customerEmail: "",
    preferredDate: "2026-08-10",
    preferredTime: "Après 17 h",
    message: "Je souhaite essayer ce véhicule.",
    consentContact: true,
    consentMarketing: false,
    website: "",
    formStartedAt: 1_000,
    publicPageUrl: "/g/garage-a/vehicles/peugeot-308-aaaaaaaa",
    ...overrides,
  }
}

function validated(overrides: Partial<ValidatedPublicLeadInput> = {}): ValidatedPublicLeadInput {
  return {
    ...input(),
    type: "APPOINTMENT_REQUEST",
    customerPhone: "0612345678",
    customerEmail: null,
    preferredDate: "2026-08-10",
    preferredTime: "Après 17 h",
    message: "Message",
    ...overrides,
  }
}

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "aaaaaaaa-1111-2222-3333-444444444444",
    garage_id: "garage-a",
    vehicle_id: "vehicle-a",
    source: "LIVE_VEHICLE_PAGE",
    type: "APPOINTMENT_REQUEST",
    status: "NEW",
    customer_name: "Marie Martin",
    customer_phone: "0612345678",
    customer_email: null,
    preferred_date: "2026-08-10",
    preferred_time: "Après 17 h",
    message: "Je souhaite essayer ce véhicule.",
    public_page_url: "/g/garage-a/vehicles/peugeot-308-aaaaaaaa",
    public_vehicle_slug: "peugeot-308-aaaaaaaa",
    public_garage_slug: "garage-a",
    consent_contact: true,
    consent_marketing: false,
    vehicle_title_snapshot: "Peugeot 308 GT",
    vehicle_price_snapshot_cents: 2_499_000,
    vehicle_brand_snapshot: "Peugeot",
    vehicle_model_snapshot: "308",
    vehicle_year_snapshot: 2022,
    created_at: "2026-07-29T10:00:00.000Z",
    updated_at: "2026-07-29T10:00:00.000Z",
    contacted_at: null,
    closed_at: null,
    archived_at: null,
    ...overrides,
  }
}

test("le parser ne prend que les champs publics attendus", () => {
  const data = new FormData()
  for (const [key, value] of Object.entries(input())) {
    if (typeof value === "boolean") {
      if (value) data.set(key, "on")
    } else data.set(key, String(value))
  }
  data.set("garageId", "garage-b")
  data.set("status", "WON")
  const parsed = parsePublicLeadInput(data)
  assert.equal("garageId" in parsed, false)
  assert.equal("status" in parsed, false)
  assert.equal(parsed.garageSlug, "garage-a")
})

test("normalise le téléphone et accepte téléphone ou e-mail", () => {
  assert.equal(normalizePhone("+33 (0)6 12 34 56 78"), "+330612345678")
  assert.equal(validatePublicLead(input(), new Date("2026-07-30")).success, true)
  assert.equal(validatePublicLead(input({ customerPhone: "", customerEmail: "client@example.fr" }), new Date("2026-07-30")).success, true)
})

test("refuse nom, contact, e-mail, message, consentement, type et date invalides", () => {
  const cases = [
    input({ customerName: "A" }),
    input({ customerPhone: "", customerEmail: "" }),
    input({ customerPhone: "", customerEmail: "invalide" }),
    input({ message: "x".repeat(2001) }),
    input({ consentContact: false }),
    input({ type: "UNKNOWN" }),
    input({ preferredDate: "2026-07-01" }),
  ]
  for (const candidate of cases) {
    assert.equal(validatePublicLead(candidate, new Date("2026-07-30")).success, false)
  }
  assert.equal(validateLeadContactability(input()).valid, true)
})

test("le guard bloque honeypot et envoi trop rapide puis produit une empreinte stable", () => {
  assert.deepEqual(guardLeadSubmission(validated({ website: "spam" }), 5_000), { allowed: false, reason: "honeypot" })
  assert.deepEqual(guardLeadSubmission(validated({ formStartedAt: 4_000 }), 5_000), { allowed: false, reason: "too_fast" })
  const first = guardLeadSubmission(validated(), 5_000)
  const second = guardLeadSubmission(validated(), 5_000)
  assert.deepEqual(first, second)
  assert.equal(first.allowed && first.fingerprint.length, 64)
})

test("les transitions et permissions restent explicites", () => {
  assert.equal(canTransitionLeadStatus("NEW", "TO_CONTACT"), true)
  assert.equal(canTransitionLeadStatus("NEW", "WON"), false)
  assert.equal(canTransitionLeadStatus("CONTACTED", "APPOINTMENT_PLANNED"), true)
  assert.equal(canManageLead("member", "status"), true)
  assert.equal(canManageLead("member", "archive"), false)
  assert.equal(canManageLead("owner", "archive"), true)
})

test("la priorité élevée, normale et faible est déterministe", () => {
  const now = new Date("2026-07-30T12:00:00Z")
  assert.equal(computeLeadPriority({ status: "NEW", type: "TEST_DRIVE_REQUEST", createdAt: lead().created_at, vehicleAvailable: true, now }), "HIGH")
  assert.equal(computeLeadPriority({ status: "CONTACTED", type: "VEHICLE_QUESTION", createdAt: lead().created_at, vehicleAvailable: true, now }), "NORMAL")
  assert.equal(computeLeadPriority({ status: "ARCHIVED", type: "VEHICLE_QUESTION", createdAt: lead().created_at, vehicleAvailable: true, now }), "LOW")
})

test("construit les liens téléphone et e-mail sans donnée interne", () => {
  assert.equal(buildTelephoneHref("06 12 34 56 78"), "tel:0612345678")
  assert.equal(buildTelephoneHref(null), null)
  const mail = buildEmailHref({ email: "contact@example.fr", vehicleTitle: "Peugeot 308", publicUrl: "/g/a/vehicles/b" })
  assert.match(mail ?? "", /^mailto:contact@example\.fr/)
  assert.doesNotMatch(mail ?? "", /purchase|margin|notes/)
  assert.equal(buildEmailHref({ email: "invalid" }), null)
})

test("hiérarchise les CTA et masque les coordonnées absentes", () => {
  const actions = buildVehicleLeadContactActions({
    phone: null, email: null, vehicleTitle: "Peugeot 308", publicUrl: "/g/a/vehicles/b",
  })
  assert.equal(actions[0].label, "Demander un rendez-vous")
  assert.equal(actions.some((action) => action.id === "phone" || action.id === "email"), false)
})

test("le snapshot public reste minimal et conserve les centimes", () => {
  const snapshot = buildLeadVehicleSnapshot({
    title: "Peugeot 308 GT", priceCents: 2_499_000, slug: "peugeot-308",
    make: "Peugeot", model: "308", year: 2022,
  })
  assert.deepEqual(Object.keys(snapshot), ["title", "priceCents", "slug", "brand", "model", "year"])
})

test("les ViewModels préparent libellés, prix, priorité et compteurs", () => {
  const rows = [lead()]
  const before = structuredClone(rows)
  const items = buildLeadListItems(rows, new Date("2026-07-30"))
  assert.equal(items[0].statusLabel, "Nouveau")
  assert.equal(items[0].priority, "HIGH")
  const detail = buildLeadDetail(rows[0], [], new Date("2026-07-30"))
  assert.match(detail.priceLabel ?? "", /24/)
  const summary = buildLeadDashboardSummary(rows.map(({ status, type, created_at }) => ({ status, type, created_at })), new Date("2026-07-31T12:00:00Z"))
  assert.equal(summary.newCount, 1)
  assert.equal(summary.overdueCount, 1)
  assert.deepEqual(rows, before)
})

test("la liste back-office rend les données préparées sans code SQL visible", () => {
  const html = renderToStaticMarkup(<LeadList leads={buildLeadListItems([lead()], new Date("2026-07-30"))} />)
  assert.match(html, /Marie Martin/)
  assert.match(html, /Nouveau/)
  assert.doesNotMatch(html, /APPOINTMENT_REQUEST|LIVE_VEHICLE_PAGE/)
})

test("la migration interdit l'insert anon libre et impose tenant, source et statut", () => {
  const sql = readFileSync("supabase/migrations/20260730000030_create_vehicle_leads.sql", "utf8")
  assert.match(sql, /security definer/i)
  assert.match(sql, /set search_path = public, pg_temp/i)
  assert.match(sql, /and g\.live_enabled/)
  assert.match(sql, /publication_status = 'PUBLISHED'/)
  assert.match(sql, /'LIVE_VEHICLE_PAGE'[\s\S]*'NEW'/)
  assert.match(sql, /revoke all on table public\.leads from anon/i)
  assert.doesNotMatch(sql, /policy[\s\S]{0,120}with check\s*\(\s*true\s*\)/i)
})

test("les repositories back-office filtrent par garage avant recherche et pagination", () => {
  const source = readFileSync("src/features/leads/data/garage-lead-repository.ts", "utf8")
  assert.match(source, /\.eq\("garage_id", session\.garageId\)/)
  assert.doesNotMatch(source, /\.select\(\s*["'`]\*/)
})

test("les pages leads possèdent chacune un seul h1", () => {
  for (const file of [
    "src/app/(dashboard)/leads/page.tsx",
    "src/app/(dashboard)/leads/[leadId]/page.tsx",
  ]) {
    const source = readFileSync(file, "utf8")
    assert.equal(source.match(/<h1/g)?.length, 1)
  }
})
