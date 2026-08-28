# V1 Human Acceptance Test Plan

**Garage OS — SAP tenant (`sap`)**
**Date:** 2026-08-27
**Audience:** Product owner / non-developer tester
**Prerequisite:** Migrations GO-0090 applied (see `GO_0090_V1_INTEGRATION_GATE.md` §17) and staff login available.

Use real imported SAP data where noted. Do **not** reset or re-import legacy data.

---

## How to use this document

For each test: navigate as instructed, perform the action, compare with **Expected result**, mark **PASS / FAIL**, add notes.

---

## A — Login / tenant

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| A1 | `/login` | Log in with SAP staff account | Dashboard loads; garage name visible | ☐ | |
| A2 | Header / garage selector | Confirm active garage is SAP | Only SAP data visible | ☐ | |
| A3 | `/select-garage` (if shown) | Select SAP garage | Redirect to dashboard | ☐ | |

---

## B — Dashboard

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| B1 | `/dashboard` | Open dashboard | Page loads without error | ☐ | |
| B2 | Dashboard | Check appointment / leads / commercial cards | Counts reflect real SAP data (not obviously demo BMW/Jaguar fixture labels) | ☐ | Known: stock KPI block may still show fixture vehicles until P1-001 fixed |
| B3 | `/intelligence` | Open “Priorités du jour” | Recommendations load from database | ☐ | |

---

## C — Customers

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| C1 | `/customers` | Open client list | **84** customers listed (approx.) | ☐ | |
| C2 | `/customers` | Search a known imported name | Matching customer found | ☐ | |
| C3 | `/customers/new` | Create a **test** customer (disposable) | Customer saved; appears in list | ☐ | Label as test in name |

---

## D — Customer 360

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| D1 | `/customers/{id}` | Open an imported customer | Profile, KPIs, timeline visible | ☐ | Pick customer with appointments |
| D2 | Customer 360 | Review timeline | Shows leads, appointments, historical payments, vehicles as applicable | ☐ | |
| D3 | Customer 360 | Click “Nouveau rendez-vous” quick action | Opens `/appointments/new?customerId=…` with customer pre-selected | ☐ | |
| D4 | Customer 360 | Click “Nouveau devis” | Opens quote creation with customer context | ☐ | Requires billing migrations |
| D5 | Customer 360 | Click linked stock vehicle (if present) | Navigates to `/stock/{id}` | ☐ | |

---

## E — Stock

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| E1 | `/stock` | Open stock list | **18** imported vehicles visible | ☐ | |
| E2 | `/stock/{id}` | Open vehicle with photos | Vehicle detail loads | ☐ | |
| E3 | Stock | Confirm excluded vehicles **4915, 4927, 6054** absent | Not in list | ☐ | |

---

## F — Media photos

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| F1 | `/stock/{id}` | Scroll to Media Studio section | Gallery shows imported photos | ☐ | |
| F2 | Media Studio | Verify primary/cover image | One image marked primary | ☐ | |
| F3 | Media Studio | Reorder two images (if migration applied) | Order persists after refresh | ☐ | |
| F4 | `/stock` | Count vehicles with photos | Majority of 18 vehicles have ≥1 photo | ☐ | |

---

## G — Exterior 360

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| G1 | `/stock/{id}/360` | Open 360 editor | Page loads; upload UI or existing sequence | ☐ | May be empty if not captured |
| G2 | 360 (if sequence exists) | Rotate viewer | Frames advance smoothly | ☐ | |

---

## H — Interior panorama

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| H1 | `/stock/{id}/interior-tour` | Open interior tour | Upload UI or panorama viewer | ☐ | |
| H2 | Interior (if uploaded) | Drag to look around | Photo-sphere viewer responds | ☐ | |

---

## I — Leads / commercial

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| I1 | `/leads` | Open leads | **121** leads approx. | ☐ | |
| I2 | `/leads/{id}` | Open lead linked to customer | Link to customer fiche works | ☐ | |
| I3 | `/commercial` | Open commercial inbox | Real leads/threads visible | ☐ | |

---

## J — Appointments

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| J1 | `/appointments` | Open agenda | **495** appointments accessible (paginated) | ☐ | |
| J2 | `/appointments/{id}` | Open historical appointment | Badge “Historique importé”; no reschedule actions | ☐ | e.g. BOOKING:3795 anonymous |
| J3 | `/appointments/new?customerId={uuid}` | Create **test** future appointment | Saved; appears on agenda | ☐ | Disposable |
| J4 | Appointment detail | Click “Fiche client” | Customer 360 opens | ☐ | |

---

## K — Services

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| K1 | `/settings/services/catalog` | View service offers | SAP-configured offers visible | ☐ | |
| K2 | Public site `/g/sap/services` | View public services | Offers displayed | ☐ | |

---

## L — Registration / carte grise

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| L1 | `/registration` | Open dossiers list | Page loads | ☐ | |
| L2 | `/registration/new?customerId={uuid}` | Create **test** dossier | Dossier created | ☐ | Disposable |
| L3 | `/registration/{caseId}` | Open dossier | Customer link works | ☐ | |

---

## M — Quote

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| M1 | `/billing/quotes` | Open quotes list | Page loads (may be empty) | ☐ | Requires migrations |
| M2 | `/billing/quotes/new?customerId={uuid}` | Create draft quote with 1 line | Draft saved with totals | ☐ | |
| M3 | Quote detail | Mark sent / view PDF link | PDF downloads/opens | ☐ | |

---

## N — Invoice

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| N1 | `/billing/invoices` | Open invoices list | Page loads | ☐ | |
| N2 | Convert quote → invoice OR create invoice | Issue invoice | Number assigned; status ISSUED | ☐ | |
| N3 | Invoice detail | Download PDF | PDF shows customer + lines | ☐ | |
| N4 | Invoice detail | Section “Facturation électronique” | Shows readiness status (not “conforme” without provider) | ☐ | |

---

## O — Payment

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| O1 | Invoice detail | Record manual payment | Status updates to PAID/PARTIALLY_PAID | ☐ | |
| O2 | `/payments` | Open payments dashboard | **0** live PayPlug payments | ☐ | |
| O3 | Customer 360 | Check historical payments section | Shows imported **55** historical payments; total **3 421,00 €** | ☐ | Read-only |

---

## P — Credit note

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| P1 | Issued invoice | Create credit note | Linked to source invoice | ☐ | |
| P2 | Credit note detail | Verify amounts | Totals consistent | ☐ | |

---

## Q — PDF

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| Q1 | Quote / invoice | Open PDF route | French formatting; garage + customer blocks | ☐ | |
| Q2 | PDF | Verify disclaimer | PDF is commercial document, not claimed as Factur-X e-invoice | ☐ | |

---

## R — E-invoicing readiness

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| R1 | `/settings/billing/e-invoicing` | Open settings | Provider mode visible; **no API tokens** shown | ☐ | |
| R2 | Issued invoice | View e-invoicing section | Clear status: Non configurée / Prête / etc. | ☐ | |
| R3 | Settings | Attempt production mode without env | Production blocked | ☐ | |

---

## S — Mobile (manual)

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| S1 | Phone browser | Repeat C1, E1, J1, M1 | Layout usable; no horizontal overflow | ☐ | UNTESTED in automation |
| S2 | Phone | Customer 360 quick actions | Buttons tappable | ☐ | |

---

## T — Public vehicle experience

| # | Where | Action | Expected result | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| T1 | `/g/sap/stock` | Browse public catalog | Published vehicles visible | ☐ | |
| T2 | `/g/sap/vehicules/{slug}` | Open vehicle with photos | Images load from Storage | ☐ | |
| T3 | Public vehicle | Verify tenant isolation | No draft/unpublished vehicles | ☐ | |

---

## Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Product owner | | | ☐ All critical (A–F, J, O, T) PASS ☐ Blocked |

**Blockers reference:** `docs/release/V1_RELEASE_BLOCKERS.md`
