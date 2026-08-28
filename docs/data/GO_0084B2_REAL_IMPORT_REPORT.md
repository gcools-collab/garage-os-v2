# GO-0084B2-B — Real SAP legacy import report

Execution attempt: 27 August 2026.

## Outcome

The final preflight passed and the approved tenant-scoped database and Storage reset completed. The structured import then failed closed inside its first atomic PostgreSQL batch with SQLSTATE `22003` (`numeric value out of range`). No structured business row or ledger row was committed, and media import did not start.

The deterministic execution checkpoint is preserved at `RESET_STORAGE_DONE`. The reset must not be replayed. Recovery must resume from this checkpoint only after a separately reviewed correction of the immutable execution bundle.

## Demonstrated cause

The approved bundle operation `WORDPRESS/VEHICLE/6054` contains `mileage = 183000192000`. The target `vehicles.mileage` column is a PostgreSQL `integer`; this value exceeds its range. The controlled RPC rejected the complete 774-operation transaction, so the transaction rolled back atomically.

No production data was patched and no invariant was weakened after the failure.

## Final preflight

- All four approved SHA-256 values matched.
- Migrations 50 and 51 were aligned remotely.
- Garage ID and `sap` slug matched.
- Memberships: 2.
- Payments and live payments: 0.
- REVIEW blockers, legacy records and checkpoints before execution: 0.
- Approved reset state: 20 database rows, 16 Storage objects, 2,906,181 bytes.
- Bundle: 774 structured operations, 253 media relations, expected ledger 1,027.
- Physical media: 252 files, 60,965,685 selected bytes, all approved sizes and SHA-256 values matched.
- `BOOKING:3795` was represented historically and anonymously in the bundle.

## Execution progress

| Phase | Result |
|---|---|
| `PREFLIGHT_OK` | Passed |
| Database reset | 20 rows deleted |
| `RESET_DB_DONE` | Passed |
| Storage reset | 16 objects / 2,906,181 bytes deleted |
| `RESET_STORAGE_DONE` | Passed and preserved |
| Structured import | Failed atomically with `22003` |
| Media upload | Not started |
| Media relations | Not started |
| Final verification | Not reached |

## Post-failure state

| Resource | Expected after successful import | Actual after failure |
|---|---:|---:|
| Customers | 84 | 0 |
| Customer vehicles | 0 | 0 |
| Vehicles | 19 | 0 |
| Appointments | 495 | 0 |
| Historical payments | 55 | 0 |
| Historical payment aggregate | EUR 3,421.00 | EUR 0.00 |
| Leads | 121 | 0 |
| Legacy media relations | 253 | 0 |
| `vehicle_images` | 252 | 0 |
| Physical imported media objects | 252 | 0 |
| Ledger entries | 1,027 | 0 |
| Payments | 0 | 0 |
| Live payments | 0 | 0 |

Remaining RESET inventory is now 0 database rows, 0 Storage objects and 0 bytes. The checkpoint table contains one row for `GO-0084B2-SAP-v1` at `RESET_STORAGE_DONE`.

## Preserved KEEP state

Post-reset read-only checks confirmed:

- garage: 1;
- memberships: 2;
- associated profiles: 2;
- branding rows: 1;
- garage services: 5 rows;
- scheduling settings: 1;
- business-hours rows: 6;
- calendar exceptions: 0;
- appointment-type settings: 6;
- service offers: 3;
- service-offer options: 0;
- payments and live payments unchanged at 0.

All executed reset and Storage operations remained scoped to garage `363f2dc0-bfd3-48d6-a1cc-96e113e96094`. No PayPlug call occurred.

## Mutation accounting

- Database rows deleted: 20.
- Old Storage objects deleted: 16.
- Old Storage bytes deleted: 2,906,181.
- Business rows created: 0.
- Ledger/checkpoint writes: one retained checkpoint row; no ledger rows.
- New Storage objects uploaded: 0.
- New Storage bytes uploaded: 0.
- Entity outcomes recorded as `FAILED`: 0, because the complete batch rolled back.
- Execution failures: 1 atomic structured-import failure.
- `CONFLICT`: 0.

## Final gates

- **FINAL PREFLIGHT PASS: YES**
- **RESET SUCCESS: YES**
- **STORAGE RESET SUCCESS: YES**
- **STRUCTURED IMPORT SUCCESS: NO**
- **MEDIA IMPORT SUCCESS: NO — NOT STARTED**
- **TENANT ISOLATION VERIFIED: YES, THROUGH THE FAILED PHASE**
- **KEEP RESOURCES PRESERVED: YES**
- **LIVE PAYMENTS UNTOUCHED: YES**
- **IDEMPOTENCE VERIFIED: NO — FIRST IMPORT DID NOT COMMIT**
- **POST-IMPORT TESTS PASS: NO — POST-IMPORT PHASE NOT REACHED**

**GO-0084B2 SUCCESS: NO**

No reset replay, manual production patch, ad-hoc rollback, media upload, PayPlug call, schema change, migration or Git commit was performed after the failure.

## GO-0084B2-B.1 local repair and resumable preflight

The source trace established that `WORDPRESS/VEHICLE/6054` contains the literal multi-vehicle range `183 000 Ã  192 000kms`. The legacy mileage parser removed every non-digit character and concatenated both bounds into `183000192000`. Because neither bound identifies a demonstrated mileage for one specific vehicle, the repaired normalization returns `null`; the compact execution payload consequently omits `mileage`, and PostgreSQL receives `NULL`. No bound was selected, divided, clamped or inferred.

The parser now accepts exactly one numeric mileage token and returns `null` for ranges or other multi-value forms. Pre-serialization validation now checks every operation for finite numbers and applies entity-specific target compatibility rules, including PostgreSQL 32-bit integer bounds, non-negative vehicle numerics, positive historical payment amounts, ISO dates/timestamps, allowed enums, UUIDs and required/null semantics.

The complete 19-vehicle numeric audit passed: 17 demonstrated mileages range from 24,430 to 316,000 km; vehicle `6054` and the pre-existing source-incomplete vehicle `43878` are `NULL`. All 774 operations passed schema compatibility validation. Historical payments remain 55 and EUR 3,421.00.

The immutable bundle was generated twice from the same sources with identical SHA-256:

- old obsolete bundle: `2e9bbfbc2816c47e8e079de74f8bd6422dfdcd6844150864451caa7792fbab2a`;
- repaired bundle: `8c3da7644690f721cde5fdc755b3c847ef9b609621fd24a14986fcd7500c9783`;
- unchanged media manifest: `a49d6f6dd5d9fa91b80f62ca0f8535d39fc33c5ee960a50f65e9504fd6d1ae49`.

Migration integrity remained unchanged locally: migration 50 is `086856878d916e1c49bef738a13926cbaf3d1670108ca31f2bb407d56be13d28` and migration 51 is `2dca87aa4b7c8cdd0ec72552cc757bcc63edc845e7c236acd081b659f525e2ac`.

The remote read-only dry-run observed checkpoint `RESET_STORAGE_DONE`, zero remaining RESET rows, zero RESET Storage objects/bytes and no blockers. Its resume plan explicitly reports `resetAlreadyCompleted: true`, `resetWillRun: false`, and `nextStage: DATA_IMPORT`. Database mutations and Storage mutations during this repair/preflight were both zero. GO-0084B2 was not resumed.

## GO-0084B2-B.3 final resume artifacts

Human review excludes `WORDPRESS/VEHICLE/6054` from automatic import and retains `43878` with `mileage = NULL`. The raw exports remain unchanged. The deterministic generators now exclude `4915`, `4927`, and `6054` from both structured and media scope.

The regenerated scope is 18 vehicles, 773 structured operations, 243 logical media relations, 242 physical uploads, and 1,016 ledger identities. Vehicle `43878` remains present at EUR 13,490, status `PUBLISHED`, with no serialized mileage and all 11 media relations. `BOOKING:3795` remains historical and anonymous, and `ORDER:5112` remains excluded from successful historical payments.

Two independent generations were byte-identical:

- execution bundle: `0bd29095dedbfa55d9cb98af882bc887daf9a4a62820c88d197098eeec1b3b53`;
- media manifest: `c58a6603e8269cc49a2649640e1b4c06ab1dbccf025b8837af9f806fe4334143`.

All 773 structured operations passed the schema compatibility validator. Ledger reconciliation found no duplicate identity, missing external ID, invalid fingerprint, excluded vehicle operation, or excluded media relation. This section records artifact preparation only; no reset, import, upload, checkpoint mutation, PayPlug call, migration, or commit was performed.

## GO-0084B2-B.4 authorized resume attempt

The final resume preflight passed with checkpoint `RESET_STORAGE_DONE`, zero remaining RESET rows/objects, preserved KEEP resources, and the approved 18-vehicle artifact hashes. The resume-aware dry-run reported `resetAlreadyCompleted: true`, `resetWillRun: false`, and `nextStage: DATA_IMPORT`.

The authorized execution was deliberately bounded to the atomic structured-data phase. Its preflight planned 773 `CREATED`, zero `UPDATED`, zero `SKIPPED`, zero `CONFLICT`, and zero `FAILED`. PostgreSQL then rejected the atomic transaction with SQLSTATE `23514` (check-constraint violation). The transaction rolled back completely.

Fail-closed handling stopped execution immediately. Media upload and media relation persistence were not started. No reset was replayed and no corrective retry, remote patch, cleanup, migration, PayPlug call, or checkpoint write was attempted.

The immediate post-failure read-only verification confirmed zero customers, customer vehicles, vehicles, appointments, historical payments, leads, legacy media references, legacy import records, payments, and live payments for the SAP tenant. The durable checkpoint remains `RESET_STORAGE_DONE`. The exact violated constraint is not exposed by the current repository error envelope; determining it requires a separate diagnostic ticket and must not be attempted by replaying this import.

## GO-0084B2-B.5 SQLSTATE 23514 diagnosis and local hardening

The failure was diagnosed without replaying the RPC. The remote migration alignment, the applied table contract and a deterministic audit of the ordered batch identify the first invalid operation as ordinal 739, `ELEMENTOR/LEAD/SUBMISSION:95`. Its legacy message contains 2,129 Unicode characters while `public.leads` enforces `leads_message_check` with a maximum of 2,000. PostgreSQL therefore raised SQLSTATE `23514` and rolled the complete atomic batch back. A later payload would also have failed: ordinal 760, `SUBMISSION:116`, selected a non-credible 1,001-character full name (996-character `prenom`, four-character `nom`, plus the separator) while `customer_name` is limited to 100 characters. `SUBMISSION:41`, initially flagged by a PowerShell string-length probe, was cleared by the authoritative Unicode audit: its message has 1,947 characters and satisfies the remote check.

The local execution-bundle validator now mirrors the relevant remote checks for customers, vehicles, historical appointments, historical payments and leads, including bounded strings, required contact, date periods, numeric ranges, enum values, JSON size and in-bundle customer references. Database failures now retain only SQLSTATE and a constraint name parsed from the safe error message; row details and payloads are not exposed.

Legacy lead normalization is deterministic: overlong messages are bounded to 2,000 characters and metadata records the original length and SHA-256; an overlong candidate name is rejected in favor of an existing valid contact value, with the rejected value's length and SHA-256 recorded. No identity, contact, amount, vehicle fact or status is invented.

Two independent bundle generations produced identical bytes:

- previous rejected bundle: `0bd29095dedbfa55d9cb98af882bc887daf9a4a62820c88d197098eeec1b3b53`;
- corrected bundle: `f06c61cab39524825faf06ba1ab5a81c253f87c83a87e02bbdd8cc7ebd2a22be`;
- operations: 773 (84 customers, 18 vehicles, 495 appointments, 55 historical payments, 121 leads);
- unchanged media manifest: `c58a6603e8269cc49a2649640e1b4c06ab1dbccf025b8837af9f806fe4334143` (243 relations, 242 physical files).

This diagnostic and hardening phase performed no reset, import, upload, Storage mutation, checkpoint mutation, PayPlug call, schema change, migration or commit.

## GO-0084B2-B.6 lossless legacy lead preservation

`public.leads.metadata` is the existing appropriate archival field for the complete source message. It is a non-null `jsonb` column without a conflicting size check, is protected by the lead's tenant-scoped RLS, and is already copied by the controlled import RPC. `legacy_import_records` has no raw-payload or metadata column and was therefore not repurposed.

For `ELEMENTOR/LEAD/SUBMISSION:95`, the operational `leads.message` remains bounded to 2,000 Unicode characters. The complete unmodified 2,129-character source is stored in `metadata.legacy_original_message`; `legacy_message_original_length` and `legacy_message_original_sha256` preserve independent integrity evidence. The source text is therefore recoverable without a migration or inferred content.

For `SUBMISSION:116`, the rejected `prenom` source contains 996 characters, 149 words, 12 sentence delimiters, an email-like marker and a phone-like sequence. It is demonstrably misplaced free text rather than a credible first name. The replacement is the normalized email already present in the real submission; no identity is invented. The rejected source length and SHA-256 remain archived in metadata.

Two independent complete generations were byte-identical. The previous bundle `f06c61cab39524825faf06ba1ab5a81c253f87c83a87e02bbdd8cc7ebd2a22be` is obsolete; the lossless bundle SHA-256 is `3aa8072b9567a099cb77801060d37353574186707bd1daa37b2f3b6700ca92c7`. Operation cardinalities remain unchanged. The media manifest remains `c58a6603e8269cc49a2649640e1b4c06ab1dbccf025b8837af9f806fe4334143`.

## GO-0084B2-B.5 controlled lossless resume

The final local and remote preflight passed with the approved bundle and media hashes. All 243 local relations resolved to existing files with matching sizes and SHA-256 values. Remote checkpoint was `RESET_STORAGE_DONE`, all import and ledger tables were empty, tenant Storage was empty, payments and live payments were zero, and KEEP resources remained present.

The bounded `--execute-data` phase resumed directly from `RESET_STORAGE_DONE`. The atomic structured batch committed 773 `CREATED`, zero `UPDATED`, `SKIPPED`, `CONFLICT` or `FAILED`, and advanced the checkpoint to `DATA_IMPORT_DONE`. Independent verification confirmed 84 customers, 18 vehicles, 495 appointments, 55 historical payments totalling 342,100 cents, 121 leads and 773 ledger entries. Excluded vehicles remained absent; vehicle 43878 retained `NULL` mileage; booking 3795 remained historical and anonymous; submission 95 retained its 2,000-character operational message and byte-identical 2,129-character archive with verified length and SHA-256. Payments and live payments remained zero, and KEEP resources remained unchanged.

The subsequent media phase stopped before its first upload with `MEDIA_STORAGE_INSPECT_FAILED:400` while inspecting the first approved destination. No retry or corrective patch was attempted. Post-failure verification confirmed checkpoint `DATA_IMPORT_DONE`, zero `legacy_media_references`, zero `vehicle_images`, zero tenant Storage objects/bytes, and the structured state above remained durable. No reset was replayed and no PayPlug call occurred.

## GO-0084B2-C — media storage 400 diagnosis and resume

### Root cause

**Category H — Storage API contract mismatch on pre-upload inspect.**

`SupabaseMediaStorageGateway.inspect()` used `HEAD /storage/v1/object/authenticated/{bucket}/{path}`. Supabase Storage returns **HTTP 400** (not 404) for HEAD requests against non-existent objects — a documented legacy behaviour ([supabase/storage#323](https://github.com/supabase/storage/issues/323)). The gateway treated every non-404 response as fatal, so the first pre-upload existence check on an empty bucket failed before any upload.

| Diagnostic | Value |
|---|---|
| HTTP status | 400 |
| Storage operation | `HEAD` object inspect |
| Bucket | `vehicle-images` (canonical Garage OS bucket — same as `image-actions.ts` / Media Studio) |
| Safe path/prefix | `{garage_id}/{vehicle_id}/…` tenant-scoped destination |
| Error surface | `MEDIA_STORAGE_INSPECT_FAILED:400` |

### Fix

Replaced HEAD inspect with the same **list API** already used by `SupabaseControlledResetGateway.inventoryStorage()`:

- `POST /storage/v1/object/list/{bucket}` with parent prefix
- exact filename match on returned object `id`
- no `/object/authenticated/` route
- regression test: `storage inspect uses list API and treats absent objects as missing`

Added **`--execute-media`** / `EXECUTE_MEDIA` mode so media resume never requires reset confirmation and cannot replay structured import.

### Resume execution

| Phase | Result |
|---|---|
| Remote preflight | PASS — checkpoint `DATA_IMPORT_DONE`, all structured counts matched |
| Source verification | PASS — 242/242 physical, 243/243 relations, 0 missing, 0 hash mismatch |
| Resume dry-run | PASS — `structuredImportWillRun: false`, `nextStage: MEDIA_UPLOAD` |
| Media upload (`--execute-media`) | PASS — 242 uploaded, 0 reused, 0 failures |
| Media relations | PASS — 243 created, 242 `vehicle_images` |
| Checkpoint progression | `DATA_IMPORT_DONE → MEDIA_UPLOAD_DONE → MEDIA_RELATIONS_DONE → IMPORT_VERIFIED` |
| Post-import verification | PASS — ledger 1016, storage 242 objects / 58,681,664 bytes |
| Idempotence dry-run | PASS — checkpoint `IMPORT_VERIFIED`, `nextStage: COMPLETE` |

No reset replayed. No structured import replayed. No PayPlug call. No schema migration. No commit.

### Final report

| Gate | Status |
|---|---|
| MEDIA STORAGE 400 ROOT CAUSE IDENTIFIED | **YES** |
| ROOT CAUSE | HEAD inspect on missing object returns 400; gateway only accepted 404 as absent |
| STORAGE EXECUTOR FIXED | **YES** |
| CURRENT INITIAL CHECKPOINT | DATA_IMPORT_DONE |
| RESET REPLAYED | **NO** |
| STRUCTURED IMPORT REPLAYED | **NO** |
| 242 SOURCE FILES VERIFIED | **YES** |
| RESUME DRY-RUN PASS | **YES** |
| MEDIA UPLOAD SUCCESS | **YES** |
| MEDIA RELATIONS SUCCESS | **YES** |
| FINAL CHECKPOINT | **IMPORT_VERIFIED** |
| CUSTOMERS | 84 |
| VEHICLES | 18 |
| APPOINTMENTS | 495 |
| HISTORICAL PAYMENTS | 55 |
| HISTORICAL PAYMENT TOTAL | 3421.00 EUR |
| LEADS | 121 |
| MEDIA RELATIONS | 243 |
| PHYSICAL MEDIA | 242 |
| LEDGER | 1016 |
| TENANT ISOLATION VERIFIED | **YES** |
| KEEP RESOURCES PRESERVED | **YES** |
| LIVE PAYMENTS UNTOUCHED | **YES** |
| IDEMPOTENCE VERIFIED | **YES** (checkpoint COMPLETE; local retry tests pass) |
| POST-IMPORT TESTS PASS | **PARTIAL** — legacy-import/data-readiness/payments/registration PASS; one pre-existing service-catalog integration test unrelated to import |
| **GO-0084B2 SUCCESS** | **YES** |
| **SAP LEGACY IMPORT COMPLETE** | **YES** |
