# GO-0090.3 — PayPlug TEST E2E acceptance

## Phase A status

Safety and automated readiness audit performed on 27 August 2026. GO-0090.3A subsequently applied only migration 56 under explicit authorization. No PayPlug API request, payment, refund, capture, SAP mutation or commit occurred.

Human TEST execution remains blocked. Migration 56 is applied, but its post-application permission probe demonstrated that `anon` can still execute `apply_verified_payment`. A separately authorized corrective migration must explicitly revoke execution from `anon` and `authenticated`. Server TEST flags and a real public HTTPS `NEXT_PUBLIC_APP_URL` also remain unconfigured.

## Existing architecture audit

| Area | Classification | Evidence |
| --- | --- | --- |
| Service catalogue pricing | REAL | Server RPC builds immutable `commercial_snapshot`; the browser supplies no payable amount. |
| Appointment payment lifecycle | REAL / hardened locally | `AWAITING_PAYMENT` precedes provider creation; verified `PAID` confirms the appointment. |
| PayPlug REST provider | REAL | Hosted payment creation and authoritative `GET /v1/payments/{id}` exist. |
| Environment selection | FIXED locally | TEST selects only `PAYPLUG_TEST_KEY`; missing or ambiguous mode fails closed; LIVE execution is rejected. |
| Notification endpoint | REAL / hardened locally | Accepts only TEST payment notifications, retrieves the resource from PayPlug and persists through the verification RPC. |
| Browser return | REAL / non-authoritative | Reads only the tenant-scoped local state; it performs no mutation and cannot mark a payment paid. |
| Idempotence | PARTIAL remotely | Provider IDs and terminal events are unique; migration 56 adds one active payment per appointment, but RPC exposure still blocks acceptance. |
| Customer 360 | REAL | Operational PayPlug rows and imported SAP history have distinct labels, kinds and KPIs. |
| Billing reconciliation | PARTIAL by design | `invoice_payments` is separate. No invoice or invoice settlement is fabricated from a deposit. |
| Refund/capture | Contract only | No user action is exposed and no refund/capture is executed in this acceptance phase. |
| Historical SAP payments | REAL / isolated | Imported data remains in `historical_payments`; no provider call or operational payment conversion exists. |

## TEST/LIVE protection

- `PAYPLUG_MODE=test` is mandatory.
- TEST reads only `PAYPLUG_TEST_KEY`.
- `PAYPLUG_LIVE_KEY` is never selected by the application in this acceptance configuration.
- `PAYPLUG_MODE=live`, a missing mode, a missing TEST key or a non-`sk_test_` key fails before network access.
- Secrets remain server-only and are absent from client props, URLs, errors and logs.
- The local environment contains a syntactically valid TEST key, but is missing the explicit mode, enable flag and public HTTPS application URL.

## Authoritative amount and appointment lifecycle

`book_public_catalog_appointment` resolves the tenant, public offer and selected options in PostgreSQL. It stores `amount_due_now_cents`, currency and payment strategy in `appointments.commercial_snapshot`. Payment creation reads that snapshot and accepts only a positive integer amount in EUR with `FULL_PAYMENT` or `DEPOSIT`.

The creation action now also verifies the public garage slug, garage ID, non-historical appointment and `AWAITING_PAYMENT` status. Provider failure moves the local attempt to `FAILED`; it does not confirm the appointment.

Current SAP public candidate for the deposit acceptance:

- start page: `/g/sap/services`;
- service: `Rendez-vous carte grise` (`registration-appointment`);
- expected deposit: EUR 20.00;
- expected pre-payment appointment status: `AWAITING_PAYMENT`;
- expected post-verification status: payment `PAID`, appointment `CONFIRMED`.

## Notification and reconciliation

PayPlug notifications are identifiers, not trusted payment evidence. The endpoint requires `object=payment` and `is_live=false`, finds an existing TEST payment, then retrieves the complete payment from PayPlug over HTTPS. The RPC compares provider ID, amount, currency, TEST environment and the three context metadata values before applying a terminal state.

Duplicate terminal notifications return `idempotent`; a mismatch returns HTTP 409 and records no financial success. Unknown IDs return 404. A forged return URL cannot call the verification RPC.

The local additive migration is required because the currently applied schema does not prove all execution invariants:

- unique active operational payment per appointment;
- explicit `service_role` execution privilege for `apply_verified_payment`;
- notification entity constraint compatible with `appointment`, `registration_case` and `payment`.

Migration 56 was applied remotely during GO-0090.3A after a dry-run proved it was the only pending migration. Post-application verification found a material permission defect: a service-role probe and an anonymous probe against an unknown payment ID both returned `not_found`. The anonymous call should have been denied. No payment row or event was mutated by either probe.

## GO-0090.3A independent migration review

- Reviewed SHA-256: `4EA66C9129A2797CD64360C4C75D241D1511266393339865CEAD0F32A9CDF965`.
- Statements: one partial unique index on active operational payments; one `service_role` function grant; replacement of the notification entity constraint with an additive allowed-value set.
- Tables affected: `payments` (index only) and `notifications` (check constraint only).
- Function affected: `apply_verified_payment` (execution privilege only).
- RLS changes: none.
- Stored secrets: none.
- Preflight compatibility: zero global payment rows, zero active duplicates, zero notification rows and zero incompatible entity values.
- SAP/Billing impact: none; `historical_payments`, imported appointments and `invoice_payments` are untouched.
- Application result: migration history records `20260827000056`; Supabase CLI reported successful application. Its optional local catalog cache then warned because Docker Desktop was unavailable, without reverting the remote migration.
- Security result: **FAIL** because `anon` execution remains possible. No corrective migration was created or applied in this gate.

## GO-0090.3B corrective gate

A minimal corrective migration was prepared locally as `20260828000057_lock_down_verified_payment_rpc.sql` with SHA-256 `A61DC7B89C4E6A0F25FD2C73DAD5155B6AFC4A1334C53CAF80002CAC2E12433E`. It explicitly revokes `apply_verified_payment` from `PUBLIC`, `anon` and `authenticated`, then grants it only to `service_role`. It creates no function or overload and changes no business logic, RLS or data.

The migration was **not applied** because the required payment mutation surface audit found another critical default-EXECUTE defect. `record_invoice_payment(uuid,uuid,integer,text,timestamptz,text,text)` is `SECURITY DEFINER`; the migration grants it to `authenticated` without first revoking `PUBLIC`, and its body does not perform a garage membership check before recording an invoice settlement. A non-mutating anonymous probe using nonexistent garage and invoice UUIDs returned SQLSTATE `P0001` (`invoice not payable`) instead of `42501`, proving that the function body executed as `anon`.

GO-0090.3B therefore stopped before remote application, TEST configuration, deployment review or any PayPlug request. A separately reviewed Billing permission correction is required before the PayPlug security gate can resume.

## GO-0090.3C complete payment RPC hardening

The still-unapplied migration 57 now closes the complete bounded payment and Billing mutation surface. `apply_verified_payment` explicitly revokes `PUBLIC`, `anon` and `authenticated`, and grants only `service_role`; its provider-verification body is unchanged.

The Billing audit classified `create_billing_document_draft`, `upsert_billing_document_line`, `remove_billing_document_line`, `finalize_billing_document`, `convert_quote_to_invoice` and `record_invoice_payment` as authenticated employee operations. Their existing financial implementations are renamed to internal functions with all API-role execution revoked. New same-signature wrappers require `auth.uid()` to be a member of the supplied garage before invoking those implementations. `record_invoice_payment` additionally resolves the invoice garage from `billing_documents`, rejects a mismatched caller garage and verifies membership against that authoritative garage before any settlement mutation.

All guarded and internal functions use the existing explicit `public, pg_temp` search path, use qualified object/function references at the new authorization boundary, and contain no dynamic SQL. The application continues to invoke the public Billing signatures through the authenticated Supabase client; no `service_role` Billing path is required. Internal numbering and total-recalculation helpers remain non-public.

The previous migration 57 hash `A61DC7B89C4E6A0F25FD2C73DAD5155B6AFC4A1334C53CAF80002CAC2E12433E` is obsolete. The reviewed replacement SHA-256 is `98CBEAF3FF0C81BF53926386FB4FC6E397608D3123E0B1CF6B310146EAF63E43`. At the close of GO-0090.3C, migration 57 remained local and unapplied pending human authorization.

## GO-0090.3D remote application and readiness

Immediately before application, migration 57 still matched the approved SHA-256 `98CBEAF3FF0C81BF53926386FB4FC6E397608D3123E0B1CF6B310146EAF63E43`; it was the only pending migration and the protected SAP/payment baseline matched. `supabase db push --linked` applied only `20260828000057`. The subsequent migration history is fully aligned through 57. The CLI emitted a Docker-only local catalog-cache warning after the remote migration completed; it did not roll back the application.

Remote non-mutating probes used only nonexistent UUIDs:

- `apply_verified_payment` as `anon`: HTTP 401, SQLSTATE `42501`, permission denied;
- `apply_verified_payment` as `service_role`: HTTP 200, safe `not_found` outcome;
- `record_invoice_payment` as `anon`: HTTP 401, SQLSTATE `42501`, permission denied;
- the five other public Billing mutation wrappers as `anon`: HTTP 401, SQLSTATE `42501` each.

No safe authenticated access token was available for a direct authenticated HTTP probe, and no user/session was created for testing. The effective authenticated classifications are therefore supported by the exact applied migration grant/revoke contract and automated tests, but the direct `authenticated` remote probe remains untested. The deployed `record_invoice_payment` wrapper resolves `billing_documents.garage_id`, compares it to the requested garage and checks `garage_members` using `auth.uid()` before calling the isolated implementation.

Post-migration data integrity remained unchanged: checkpoint `IMPORT_VERIFIED`, 84 customers, 18 SAP vehicles, 495 appointments, 55 historical payments totalling EUR 3,421.00, 1,016 ledger rows, 243 legacy media relations, zero operational payments, zero LIVE payments and zero invoice settlements.

Local server configuration now explicitly sets `PAYPLUG_ENABLED=true` and `PAYPLUG_MODE=test`; the existing TEST key remains server-only and was neither displayed nor copied into a tracked file. LIVE remains blocked by application validation and no LIVE key was read or used. `NEXT_PUBLIC_APP_URL` is still absent. The repository has no Vercel linkage, GitHub deployment record or deployment workflow, and no public Garage OS host was found. A real HTTPS deployment and its server-side TEST environment must therefore be configured before the human scenario.

The webhook route exists in the production build and is intentionally public, but public reachability cannot be proven without a deployed HTTPS host. No PayPlug connectivity call was made because the documented API has no selected non-mutating authentication probe suitable for this gate.

## Failure states

| Condition | Behavior |
| --- | --- |
| Missing/invalid TEST configuration | Fail closed before DB/provider activity. |
| LIVE mode requested | `PAYPLUG_LIVE_DISABLED`; no network call. |
| Missing public HTTPS URL | No payment row and no provider call. |
| Unknown/foreign garage or historical appointment | Rejected. |
| Invalid commercial snapshot/tampered client amount | Rejected; only snapshot amount is used. |
| Provider creation failure | Attempt becomes `FAILED`; appointment remains awaiting payment. |
| Browser cancellation | No paid state; appointment remains awaiting payment. |
| Browser return before notification | “Paiement en cours de vérification”; no success mutation. |
| Failed/cancelled/expired provider payment | Mapped to `FAILED`, `CANCELLED` or `EXPIRED`; never `PAID`. |
| Duplicate notification/reconciliation | Idempotent terminal application. |
| Amount, currency, environment or tenant metadata mismatch | Rejected as anomaly. |

## Read-only baseline before human TEST

- SAP checkpoint: `IMPORT_VERIFIED`.
- SAP historical payments: 55.
- SAP historical total: EUR 3,421.00.
- Operational payments: 0 (TEST 0, LIVE 0).
- Payment events: 0.
- Appointments: 495 historical `COMPLETED`; operational appointments 0; awaiting payment 0.
- Invoice payments: 0.
- Migration 56: applied remotely; permission hardening incomplete because `anon` execution remains possible.

## Human TEST procedure — only after blockers are cleared

1. Apply a separately reviewed and authorized corrective migration that explicitly revokes `apply_verified_payment` from `anon` and `authenticated`, then prove `42501` for both roles and success for `service_role`.
2. Configure the deployed server with `PAYPLUG_ENABLED=true`, `PAYPLUG_MODE=test`, `PAYPLUG_TEST_KEY` and the public HTTPS `NEXT_PUBLIC_APP_URL`.
3. Open `/g/sap/services` on that exact public HTTPS origin.
4. Select `Rendez-vous carte grise`, choose a valid slot and submit test contact data.
5. Confirm the displayed deposit is EUR 20.00 and the appointment is awaiting payment.
6. Open the hosted PayPlug page returned by Garage OS.
7. Use a current official PayPlug TEST card. As of the audit, PayPlug documents Visa `4242 4242 4242 4242` and Mastercard `5017 6700 0000 1800` for success, with any future expiry and any three-digit CVV. Recheck the official documentation immediately before execution: <https://docs.payplug.com/api/apiref.html>.
8. After returning, wait for authoritative notification reconciliation; a browser return alone must continue to show verification in progress if the webhook is delayed.
9. Inspect `/payments`, the created `/appointments/{id}`, the linked `/customers/{id}` when applicable, and Billing. No invoice should appear unless independently created.

## Post-test read-only verification

After the human reports completion, Phase B must verify provider TEST status, one payment row, amount EUR 20.00, provider reference, `is_live=false`, one terminal event, appointment `CONFIRMED`, Customer 360 operational payment visibility, no automatic invoice settlement, unchanged SAP historical baseline and zero LIVE provider activity.

Official PayPlug references used for this audit:

- API authentication, TEST/LIVE keys, notifications and authoritative retrieval: <https://docs.payplug.com/api/apiref.html>
- Hosted payment flow: <https://docs.payplug.com/api/guide-payment-en.html>
- Current TEST card support article: <https://support.payplug.com/hc/fr/articles/360021142492-Comment-tester-le-service-Qu-est-ce-que-le-mode-TEST>
