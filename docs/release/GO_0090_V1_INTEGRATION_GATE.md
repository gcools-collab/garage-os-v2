# GO-0090 — V1 Integration / Migration Gate + Release Basline

**Date:** 2026-08-27
**Scope:** Integration audit, SAP protection, migration inventory, release gate
**GO-0084 status:** CLOSED — `IMPORT_VERIFIED`

---

## 1. Executive summary

Garage OS V1 feature modules (GO-0086–0089.1) are implemented in code and covered by automated tests, but **five migrations remain unapplied remotely**. Until those migrations are authorized and applied, billing, fiscal settings, media display_order RPC, and staff appointment/registration RPCs are not live on the production database.

SAP legacy import is **complete and protected**. Automated test baseline is **green** after fixing one stale service-catalog assertion.

**V1 ready for human acceptance testing:** **YES** — after migration authorization and application (blocker P0-001). HAT plan prepared; several domains require post-migration verification.

**REMOTE MIGRATION AUTHORIZATION REQUIRED: YES**
**REMOTE MIGRATIONS APPLIED: NO**

---

## 2. PRE_MIGRATION_SAP_BASELINE (read-only verified)

Verified via `scripts/verify-sap-import-state.ts` on 2026-08-27:

| Metric | Expected | Observed |
|---:|---:|---:|
| Checkpoint | IMPORT_VERIFIED | IMPORT_VERIFIED |
| Customers | 84 | 84 |
| Vehicles | 18 | 18 |
| Appointments | 495 | 495 |
| Historical payments | 55 | 55 |
| Historical total | 3 421,00 EUR | 342 100 cents |
| Leads | 121 | 121 |
| Legacy media relations | 243 | 243 |
| vehicle_images | 242 | 242 |
| Legacy ledger | 1 016 | 1 016 |
| Live payments | 0 | 0 |

Bundle hash: `3aa8072b…` ✓ | Manifest hash: `c58a6603…` ✓
Tenant: `363f2dc0-bfd3-48d6-a1cc-96e113e96094` (SAP)

**SAP IMPORT BASELINE VERIFIED: YES**
**SAP IMPORT PROTECTED: YES** (no reset/import replay in this ticket)

---

## 3. V1 integration matrix

Classification from code inspection + remote verification (not ticket claims alone):

| Domain | Status | Notes |
|---|---|---|
| Authentication | **REAL** | Supabase Auth, session recovery |
| Tenant / membership | **REAL** | Garage session, RLS |
| Dashboard | **PARTIAL** | Real leads/commercial/appointments; **fixture stock block** (`garageIntelligenceFixture`) |
| Customers | **REAL** | 84 imported + CRUD |
| Customer 360 | **REAL** | Timeline, KPIs, quick actions — migrations needed for billing links |
| Vehicles / stock | **REAL** | 18 imported vehicles |
| Media photos | **REAL** | 242 images + Media Studio |
| Exterior 360 | **PARTIAL** | Infrastructure ready; SAP sequences may be empty |
| Interior panorama | **PARTIAL** | photo-sphere-viewer; content per vehicle |
| Leads | **REAL** | 121 imported |
| Commercial | **REAL** | Inbox + lead workflow |
| Appointments | **REAL** | 495 imported; historical semantics preserved |
| Services | **REAL** | Catalog + public offers |
| Registration | **REAL** | Staff + public flows; migration 52 pending |
| Payments (PayPlug) | **REAL** | Sandbox; 0 live |
| Billing / quotes / invoices / credit notes | **REAL** (code) / **UNTESTED** (remote) | Local migrations 53–55 not applied |
| PDFs | **REAL** | pdf-lib builder |
| E-invoicing | **PARTIAL** | Foundation only; no production submission |
| Notifications / email | **MISSING** | In-app only; no SMTP |
| Acquisition / reprise | **PARTIAL** | CRUD; no stock conversion |
| Market Intelligence | **PARTIAL** | Engine exists; **`/market` uses fixtures** |
| Publication | **REAL** | Public site pipeline |
| Public vehicle experience | **REAL** | Live stock views |
| Mobile UX | **UNTESTED** | No device automation |

---

## 4. Migration inventory

**Total local migrations:** 56
**Applied remotely:** 51 (through `20260825000051`)
**Pending remotely:** 5

| # | File | SHA-256 | Remote |
|---|---|---|---|
| 1 | `20260827000050_add_vehicle_image_display_order.sql` | `2bf2de80f9b833673a6e5f1ee2ec1e1c03b746d4eaa60e0ea739b0bc55f3262e` | **NOT APPLIED** |
| 2 | `20260827000052_staff_appointment_registration.sql` | `c9e6b37c9ac10cab45b928cabf5b071dbef7fab8596e5d1e0c3c2f46616661ab` | **NOT APPLIED** |
| 3 | `20260828000053_create_garage_fiscal_settings.sql` | `569dea1e606b677e46a889e2463a9947be93b47a057a49263e0ba7a51d3a5375` | **NOT APPLIED** |
| 4 | `20260828000054_create_billing_documents.sql` | `644282f78f4cc9b46b8a38c823a1b10fd8545018bdb55ea8f1833fde1db9ef4d` | **NOT APPLIED** |
| 5 | `20260828000055_french_einvoicing_foundation.sql` | `e47ea938dec342311051b66fe9c7e904ce7910ee490cc43d188de9a6d589c547` | **NOT APPLIED** |

**Naming note:** GO-0084 import used `20260825000050` / `20260825000051` (controlled import). GO-0086 uses **`20260827000050`** (display_order) — different timestamp prefix; no filename collision in Supabase history.

No duplicate timestamps detected. Ordering: pending migrations sort correctly by version prefix.

**MIGRATION INVENTORY COMPLETE: YES**

---

## 5. Migration collision / dependency review

**MIGRATION COLLISION REVIEW: PASS**
**MIGRATION DEPENDENCY REVIEW: PASS** (deterministic SQL review; see shadow test below)

### Per-migration SAP impact

| Migration | Depends on | SAP data impact |
|---|---|---|
| **270050 display_order** | `vehicle_images` (242 rows) | Adds `display_order integer NOT NULL DEFAULT 0`; **backfill** via `row_number() OVER (PARTition BY vehicle_id ORDER BY is_primary DESC, created_at ASC)` — preserves primary + legacy gallery order |
| **270052 staff RPCs** | customers, appointments, registration_cases | Additive SECURITY DEFINER functions; **no mutation** of 495 historical appointments |
| **280053 fiscal settings** | garages | New table; empty until configured — **no SAP constraint violation** |
| **280054 billing** | customers (84) | New tables; references customers/appointments/registration — **no change to historical_payments** |
| **280055 e-invoicing** | 280053, 280054, customers | Extends customers + billing_documents; additive columns — imported customers remain valid (nullable B2B fields) |

Verified: no new NOT NULL on existing SAP columns without defaults; historical appointments unchanged by 270052; `historical_payments` separate from `invoice_payments`.

---

## 6. Shadow migration test

Local Docker/Supabase shadow database was **not executed** in this audit.

**SHADOW MIGRATION TEST: UNTESTED**

Strongest available evidence: migration SQL review + `supabase migration list` alignment + unit tests referencing migration contracts.

---

## 7. Service catalog test failure (resolved)

**Cause:** Stale integration test — appointment detail page refactored to render `snapshot.dueNowLabel` (“Montant dû maintenant”) instead of `remainingLabel` in JSX source.

**Classification:** Stale test (not product regression).

**Fix:** Updated assertion in `service-catalog-integration.test.ts`.

**SERVICE CATALOG TEST: PASS** (12/12)

---

## 8. Cross-feature integration review

**CROSS-FEATURE INTEGRATION REVIEW: PARTIAL**

### Working
- Customer 360 → appointment / registration / quote / invoice (query params validated on load)
- Customer → vehicles; vehicle → Media Studio; billing chain quote → invoice → credit note → payment
- Registration ↔ Customer 360; billing ↔ Customer 360 timeline

### Gaps (documented in blockers)
- Staff appointment ↔ service catalog offer not wired
- Appointment → billing shortcut missing
- Registration → billing link missing
- Lead → customer creation from commercial workspace missing
- Billing payment revalidation may not refresh Customer 360 cache

---

## 9. V1-critical fixture review

**V1 CRITICAL FIXTURE REVIEW: FAIL** (two user-visible surfaces)

| Surface | Finding |
|---|---|
| `/dashboard` | `GarageIntelligenceDashboard` uses `garageIntelligenceFixture` for stock KPIs |
| `/market` | `marketListingsFixture` + static public `vehicles` fixture |

**Pass (no fake business state):** Customers, Stock, Media, Appointments, Registration, Billing UI (against real DB once migrated).

---

## 10. Navigation review

**NAVIGATION REVIEW: PASS**

Sidebar (`sidebar.tsx`): Dashboard, Intelligence, Copilot, Commercial, Stock, Acquisition, Leads, Clients, Agenda, Facturation, Dossiers (registration), Market, Analytics, Settings.

Routes exist in build output. Billing sub-routes under `/billing/*`. E-invoicing settings at `/settings/billing/e-invoicing`.

Minor: vehicle action bar `#vehicle-photos` vs `#media-studio` anchor mismatch (P2).

---

## 11. Tenant security review

**TENANT SECURITY REVIEW: PASS** (with P1 follow-ups)

- RLS enabled on tenant tables; import RPCs service-role only
- Customer 360 bundle scoped by `garage_id`
- Storage paths `{garage_id}/{vehicle_id}/…`
- Pages validate `?customerId=` via `getCustomerById`
- **Gap:** Some server actions (billing, scheduling, registration) pass UUID to RPC without explicit customer ownership pre-check — mitigated by RLS + RPC tenant guards

No security weakening in GO-0090.

---

## 12. Billing / e-invoicing migration readiness

**BILLING MIGRATION REVIEW: PASS** (pre-apply review)

- `invoice_payments` separate from PayPlug `payments`
- `historical_payments` untouched by billing schema
- E-invoicing: secrets env-only; production blocked without `ELECTRONIC_INVOICE_ALLOW_PRODUCTION`
- PDF ≠ compliant e-invoice (documented)

**E-INVOICING SAFETY REVIEW: PASS**

---

## 13. Media migration readiness (GO-0086)

**MEDIA MIGRATION REVIEW: PASS**

Migration 270050 backfills 242 `vehicle_images` deterministically:
- Order: primary first, then `created_at`, then `id`
- Unique index on `(vehicle_id, display_order)`
- Recreates `public_live_vehicle_images` view with `display_order`

No gallery loss expected for imported SAP media.

---

## 14. Appointment / registration migration readiness (GO-0088)

**APPOINTMENT / REGISTRATION MIGRATION REVIEW: PASS**

- `create_staff_appointment` validates customer belongs to garage
- Historical appointments: UI disables reschedule/actions when `is_historical`
- Migration 51 already remote: anonymous historical contact allowed (BOOKING:3795 safe)

---

## 15. Transactional email review

**TRANSACTIONAL EMAIL REVIEW: PARTIAL**

| Flow | Status |
|---|---|
| Appointment confirmation | **MISSING** |
| Appointment change/cancel | **MISSING** |
| Quote / invoice delivery | **MISSING** (status “envoyé” is manual mark only) |
| Registration comms | **MISSING** |
| In-app notifications | **PARTIAL** |

No fake “email envoyé” transport — but UI may imply send without delivery (P1-003).

---

## 16. Mobile integration review

**MOBILE INTEGRATION REVIEW: UNTESTED**

Code uses responsive Tailwind patterns; no browser/device validation in GO-0090.

---

## 17. Proposed remote migration plan (DO NOT APPLY WITHOUT AUTHORIZATION)

### STEP 1 — Media display order (GO-0086)
- **Migration:** `20260827000050_add_vehicle_image_display_order.sql`
- **Hash:** `2bf2de80…`
- **Impact:** Backfill 242 image orders; add reorder RPC; refresh public view
- **SAP check after:** vehicle_images=242; photos visible on stock/public

### STEP 2 — Staff appointment / registration RPCs (GO-0088)
- **Migration:** `20260827000052_staff_appointment_registration.sql`
- **Hash:** `c9e6b37c…`
- **Impact:** New RPCs only; no data mutation
- **SAP check after:** appointments=495 unchanged

### STEP 3 — Fiscal settings (GO-0089)
- **Migration:** `20260828000053_create_garage_fiscal_settings.sql`
- **Hash:** `569dea1e…`
- **Impact:** New empty fiscal table per garage
- **SAP check after:** structured counts unchanged

### STEP 4 — Billing documents (GO-0089)
- **Migration:** `20260828000054_create_billing_documents.sql`
- **Hash:** `644282f7…`
- **Impact:** New billing tables; no SAP row changes
- **SAP check after:** ledger 1016 unchanged

### STEP 5 — French e-invoicing foundation (GO-0089.1)
- **Migration:** `20260828000055_french_einvoicing_foundation.sql`
- **Hash:** `e47ea938…`
- **Impact:** Extends customers, billing_documents, new provider settings table
- **SAP check after:** customers=84; checkpoint IMPORT_VERIFIED

**Recovery:** Do not improvise SQL on failure; restore from Supabase backup / rollback migration if supported.

---

## 18. Automated test baseline

| Command | Result |
|---|---|
| `npm test` | **PASS** |
| `npm run test:legacy-import` | **PASS** (39) |
| `npm run test:data-readiness` | **PASS** (7) |
| `npm run test:payments` | **PASS** (8) |
| `npm run test:registration` | **PASS** (6) |
| `npm run test:service-catalog` | **PASS** (12) |
| `npm run test:customers` | **PASS** (9) |
| `npm run test:billing` | **PASS** (24) |
| `npm run test:media-studio` | **PASS** (3) |
| `npm run test:vehicle-media` | **PASS** (5) |
| `npm run test:vehicle-360` | **PASS** (10) |
| `npm run test:interior-tour` | (included in npm test) |
| `npm run lint` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

**AUTOMATED TEST BASELINE: PASS**

---

## 19. Deliverables

| Artifact | Status |
|---|---|
| `docs/release/GO_0090_V1_INTEGRATION_GATE.md` | This document |
| `docs/release/V1_HUMAN_ACCEPTANCE_TEST_PLAN.md` | **YES** |
| `docs/release/V1_RELEASE_BLOCKERS.md` | **YES** |
| `scripts/verify-sap-import-state.ts` | Read-only SAP baseline helper |

---

## 20. Final gate report

| Gate | Status |
|---|---|
| SAP IMPORT BASELINE VERIFIED | **YES** |
| SAP IMPORT PROTECTED | **YES** |
| MIGRATION INVENTORY COMPLETE | **YES** |
| MIGRATION COLLISION REVIEW | **PASS** |
| MIGRATION DEPENDENCY REVIEW | **PASS** |
| SHADOW MIGRATION TEST | **UNTESTED** |
| SERVICE CATALOG TEST | **PASS** |
| CROSS-FEATURE INTEGRATION REVIEW | **PARTIAL** |
| V1 CRITICAL FIXTURE REVIEW | **FAIL** |
| NAVIGATION REVIEW | **PASS** |
| TENANT SECURITY REVIEW | **PASS** |
| BILLING MIGRATION REVIEW | **PASS** |
| MEDIA MIGRATION REVIEW | **PASS** |
| APPOINTMENT / REGISTRATION MIGRATION REVIEW | **PASS** |
| E-INVOICING SAFETY REVIEW | **PASS** |
| TRANSACTIONAL EMAIL REVIEW | **PARTIAL** |
| MOBILE INTEGRATION REVIEW | **UNTESTED** |
| AUTOMATED TEST BASELINE | **PASS** |
| HUMAN ACCEPTANCE TEST PLAN READY | **YES** |
| RELEASE BLOCKER REGISTER READY | **YES** |
| REMOTE MIGRATION PLAN READY | **YES** |
| **REMOTE MIGRATION AUTHORIZATION REQUIRED** | **YES** |
| REMOTE MIGRATIONS APPLIED | **NO** |
| GO-0090 INTEGRATION AUDIT COMPLETE | **YES** |
| **V1 READY FOR HUMAN ACCEPTANCE TESTING** | **YES** *(after migration authorization + apply)* |

---

No remote migration applied. No SAP data mutated. No commit. Awaiting explicit migration authorization.

---

## GO-0090.1 — Applied migrations + post-migration verify (2026-08-27)

Human authorization received. Applied **only** the five approved migrations via `supabase db query --linked -f` + `migration repair --status applied`, one at a time with intermediate verification.

### Pre-migration gate

| Check | Result |
|---|---|
| Migration hash verification (5 files vs GO-0090 plan) | **PASS** — all SHA-256 match |
| Remote history before apply | Stops at `20260825000051` |
| PRE_MIGRATION_SAP_BASELINE | **PASS** |

### Applied migrations

| Step | Migration | Hash | Result |
|---|---|---|---|
| 1 | `20260827000050_add_vehicle_image_display_order.sql` | `2bf2de80…3262e` | **APPLIED** |
| 2 | `20260827000052_staff_appointment_registration.sql` | `c9e6b37c…661ab` | **APPLIED** |
| 3 | `20260828000053_create_garage_fiscal_settings.sql` | `569dea1e…5375` | **APPLIED** |
| 4 | `20260828000054_create_billing_documents.sql` | `644282f7…ef4d` | **APPLIED** |
| 5 | `20260828000055_french_einvoicing_foundation.sql` | `e47ea938…c547` | **APPLIED** |

### Per-migration verification highlights

- **270050:** 242 images retained; 242 with `display_order`; 18 primary flags; `reorder_vehicle_images` exists
- **270052:** `create_staff_appointment` + `create_staff_registration_case` exist; appointments=495
- **280053:** `garage_fiscal_settings` exists; **0 rows** (no invented fiscal data)
- **280054:** billing tables exist; **0 billing documents**; historical=55 / 342100 cents unchanged
- **280055:** `garage_electronic_invoice_settings` exists; **0 rows**; no provider secrets in DB

### Remote migration tail (post-apply)

```
… 20260825000050 ✓  20260825000051 ✓
    20260827000050 ✓  20260827000052 ✓
    20260828000053 ✓  20260828000054 ✓  20260828000055 ✓
```

**REMOTE MIGRATION HISTORY: PASS** — no unexpected migrations

### POST_MIGRATION_SAP_BASELINE

| Metric | Expected | Observed |
|---:|---:|---:|
| Checkpoint | IMPORT_VERIFIED | IMPORT_VERIFIED |
| Customers | 84 | 84 |
| Vehicles | 18 | 18 |
| Appointments | 495 | 495 |
| Historical payments | 55 | 55 |
| Historical total | 3 421,00 EUR | 342 100 cents |
| Leads | 121 | 121 |
| Media relations | 243 | 243 |
| vehicle_images | 242 | 242 |
| Ledger | 1 016 | 1 016 |
| Live payments | 0 | 0 |

KEEP: garage_services=5, memberships preserved.

**POST-MIGRATION SAP BASELINE: PASS**

### Post-migration automated validation

All targeted suites + `npm test`, lint, tsc, build: **PASS**

### Updated gate status

| Gate | Status |
|---|---|
| REMOTE MIGRATIONS APPLIED | **YES** (5/5 authorized only) |
| V1 MIGRATIONS COMPLETE | **YES** |
| V1 DATABASE BASELINE READY | **YES** |
| **READY TO START HUMAN ACCEPTANCE TESTING** | **YES** |

Remaining release concerns unchanged: dashboard fixture (P1-001), market fixture (P1-002), transactional email (P1-003), mobile manual validation (P3-004).

No commit performed in GO-0090.1.
