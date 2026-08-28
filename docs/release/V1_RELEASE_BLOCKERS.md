# V1 Release Blocker Register

**Date:** 2026-08-27 (GO-0090)
**Scope:** Post-integration audit — blockers before external demo / production use

---

## P0 — Prevents V1 from functioning

| ID | Domain | Issue | Status (GO-0090.1) |
|---|---|---|---|
| P0-001 | Migrations | Five V1 migrations local-only | **RESOLVED** — all 5 applied remotely 2026-08-27 |
| P0-002 | Billing | Billing tables absent remotely | **RESOLVED** — migration 280054 applied; 0 docs (expected) |
| P0-003 | Stock tenant | La liste agrégeait tous les garages autorisés au lieu du garage actif | **RESOLVED GO-0090.2A** — liste, compteurs, détail et mutations média scoppés au garage actif |

---

## P1 — Must fix before external demo / daily use

| ID | Domain | Issue | Evidence | User impact | Resolution | Owner | Blocks HAT? |
|---|---|---|---|---|---|---|---|
| P1-001 | Dashboard | `GarageIntelligenceDashboard` renders **fixture stock KPIs** (`garageIntelligenceFixture`) mixed with real lead/commercial/appointment signals | `build-garage-dashboard.ts` defaults to fixture; `/dashboard/page.tsx` | Misleading stock/margin numbers on home screen | Wire dashboard stock section to `dashboard-service.ts` real queries or hide fixture block | Product eng | **YES** (dashboard section) |
| P1-002 | Market | `/market` uses `marketListingsFixture` + static `vehicles` fixture | `market/page.tsx` | Market dashboard shows fake listings | Classify as preview or connect to real market-intelligence repository | Product eng | No (non-critical path) |
| P1-003 | Email | No transactional email delivery (appointment confirm, quote/invoice send) | Grep: no SMTP/Resend; billing “Marquer comme envoyé” is status-only | Users may believe documents were emailed | Integrate provider or relabel UI (“marquer comme transmis manuellement”) | Product eng | **YES** (sections M, N) |
| P1-004 | Integration | Staff appointment creation does not select service catalog offer | `StaffAppointmentForm` hardcoded types | Catalog pricing not linked to staff RDV → billing chain broken | Wire offer picker (GO-0088 follow-up) | Product eng | Partial |
| P1-005 | Integration | No appointment → quote/invoice shortcut | `appointments/[appointmentId]/page.tsx` | Extra navigation steps; context loss risk | Add billing quick action with `appointmentId` | Product eng | No |
| P1-006 | Security | Billing/scheduling/registration actions validate UUID but not customer ownership before RPC | Cross-feature audit | Cross-garage blocked by RLS; wrong customer ID may fail silently | Add `getCustomerById` guard in actions | Security eng | No (RLS mitigates tenant) |
| P1-007 | Fiscal | Garage fiscal settings + customer B2B fields require UI + migration 53/55 | E-invoicing readiness engine | E-invoicing always “non configurée” until data entry | Human config after migrations | Operator | **YES** (section R) |

---

## P2 — Acceptable V1 limitation

| ID | Domain | Issue | Evidence | User impact | Resolution | Owner | Blocks HAT? |
|---|---|---|---|---|---|---|---|
| P2-001 | E-invoicing | No Factur-X binary; no live PA submission | GO-0089.1 report PARTIAL | Cannot claim compliant e-invoice file | Post-V1 PA credentials + adapter E2E | Product eng | No |
| P2-002 | Exterior 360 | Imported SAP vehicles may lack 360 sequences | 242 photos imported; 360 optional | 360 feature empty until captured | Capture sequences per vehicle | Operator | No |
| P2-003 | Interior tour | Requires manual upload per vehicle | Real viewer (photo-sphere-viewer) in code | Panorama empty until content added | Operator content | Operator | No |
| P2-004 | Lead → Customer | No “create customer from lead” in commercial workspace | Commercial audit | Manual customer creation | Follow-up ticket | Product eng | No |
| P2-005 | Publication preview | Public URL shown as text, not link | Publication audit | Minor UX friction | Add `<a href>` | Product eng | No |
| P2-006 | Copilot | Fake provider available in dev | `fake-copilot-provider.ts` | Dev-only; production uses configured provider | Document env requirement | Ops | No |
| P2-007 | PayPlug | Sandbox only; payment return page security finding from GO-0085 | payments tests | Production payments not live | Harden return route before prod keys | Security eng | No (0 live payments) |

---

## P3 — Post-V1 enhancement

| ID | Domain | Issue | Evidence | User impact | Resolution | Owner | Blocks HAT? |
|---|---|---|---|---|---|---|---|
| P3-001 | Acquisition | Opportunity → Stock conversion | acquisition module | Manual duplicate entry | Post-V1 workflow | Product eng | No |
| P3-002 | Market Intelligence | Full multi-source market jobs | market-intelligence partial | Limited market depth | Post-V1 | Product eng | No |
| P3-003 | Incoming e-invoices | Supplier invoice reception | GO-0089.1 POST-V1 | N/A for garage outbound focus | Post-V1 | Product eng | No |
| P3-004 | Mobile | Touch/visual validation | No browser automation in GO-0090 | Unknown mobile UX issues | Manual HAT section S | QA | No |

---

## Closed / resolved in GO-0090

| Item | Resolution |
|---|---|
| Service-catalog integration test failure | **Fixed** — stale assertion expected `remainingLabel` in page source; UI renders `dueNowLabel` |
| SAP legacy import | **Complete** — checkpoint `IMPORT_VERIFIED`, ledger 1016 |
| Customer 360 / Billing code | **Present** — blocked on migrations only |

## Closed / resolved in GO-0090.1

| Item | Resolution |
|---|---|
| P0-001 Pending V1 migrations | **Resolved** — 5 migrations applied in approved order |
| P0-002 Billing schema remote | **Resolved** — tables live; 0 fabricated documents |
| POST_MIGRATION_SAP_BASELINE | **PASS** — all counts unchanged |

## Closed / resolved in GO-0090.2A

| Item | Resolution |
|---|---|
| SAP tenant stock baseline | **PASS** — 18 véhicules : 16 publiés, 1 réservé, 1 vendu |
| Foreign vehicle in SAP Stock | **RESOLVED** — le véhicule de l'autre garage est exclu de la liste, des compteurs et du détail direct |
| Legacy thumbnails and galleries | **RESOLVED** — URLs publiques dérivées des 242 `storage_path` valides lorsque `url` est NULL |
| NULL mileage | **RESOLVED** — « Kilométrage non renseigné », sans mutation de la donnée |
| Leboncoin wording | **RESOLVED** — dernière observation persistée, aucune synchronisation automatique revendiquée |
