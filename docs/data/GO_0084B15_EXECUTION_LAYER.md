# GO-0084B1.5 — Controlled import execution layer

Implementation audit completed on 25 August 2026. GO-0084B2 was not executed. No remote mutation, reset, import, upload, deletion, PayPlug call, migration push, or commit occurred.

## Architecture

The implementation extends the existing GO-0082/83/84 domains:

- `ControlledImportRepository` remains the database import contract.
- `SupabaseControlledImportRepository` is its service-role-only implementation and delegates a complete database batch to `execute_controlled_legacy_import_batch`.
- `planControlledReset` and `executeControlledReset` consume `RESET_TABLE_MANIFEST`; no second application deletion list exists.
- `SupabaseControlledResetGateway` scopes direct rows by `garage_id`, indirect rows through SAP-owned vehicle IDs, and Storage through the exact tenant prefix.
- `executeB2Workflow` coordinates authorization, reset, data, media, checkpoints, retries, and verification modes.
- `executeApprovedMediaImport` consumes only the approved manifest and never scans the WordPress tree to select uploads.
- `scripts/controlled-legacy-import.ts` is orchestration only. Domain and repository logic remain under `src/features`.

## Local migration 50

`20260825000050_create_controlled_import_execution.sql` is created locally and was not pushed.

It adds:

- `legacy_import_checkpoints`, tenant-scoped and RLS-enabled;
- `execute_controlled_legacy_import_batch`, an atomic PostgreSQL transaction for business rows plus `legacy_import_records`;
- `execute_controlled_tenant_reset`, an atomic database reset driven by the ordered manifest payload and exact per-table counters;
- `advance_legacy_import_checkpoint`, using compare-and-set ordering;
- tenant-checked media relation and legacy vehicle resolution RPCs.

All execution RPCs are revoked from public roles and granted only to `service_role`. They reject missing tenants and cross-tenant relations. Historical payments target only `historical_payments`; no execution SQL inserts into live `payments`.

## Transaction boundaries

- One structured-data batch and its ledger entries are a single PostgreSQL transaction. Any failed entity rolls back the entire batch.
- The database reset is one RPC transaction. Every current per-table count must match the approved plan before any delete; a failure rolls back the reset.
- Storage cannot join a PostgreSQL transaction. Upload and relation persistence are therefore resumable, deterministic phases.
- Checkpoint advancement uses compare-and-set and cannot jump or silently overwrite a different execution state.

## Reset safety

Execution requires all of:

- exact authorized SAP garage ID;
- non-production environment;
- `GARAGE_OS_ENABLE_LEGACY_IMPORT=true`;
- `GARAGE_OS_ENABLE_TENANT_RESET=true`;
- `IMPORT:<garage_id>` confirmation;
- independent `RESET:<garage_id>` confirmation;
- zero live payments and zero blocking REVIEW rows;
- exact approved database and Storage counters.

The SQL reset refuses protected KEEP/REVIEW resources even when invoked with service-role credentials. Storage deletion receives only inventoried paths starting with the approved tenant prefix.

The manifest scopes for `vehicle_images` and `vehicle_market_analyses` were corrected to `INDIRECT`, matching their actual schema: tenant ownership is resolved through `vehicles` rather than a nonexistent `garage_id` column.

## Ledger and idempotence

`legacy_import_records` remains the source of idempotence:

- same source/entity/external ID and fingerprint → `SKIPPED`;
- same identity with a different fingerprint → `CONFLICT`;
- missing identity → business row and ledger row created atomically;
- database uniqueness remains the concurrency boundary.

The complete fake rehearsal uses 774 structured entities plus 253 media identities, exactly 1,027 ledger identities. Its second pass produces 774 structured `SKIPPED`, reuses uploaded objects, and creates no duplicate media relation or `vehicle_images` row.

## Media verification and recovery

Before every upload the executor verifies:

- approved tenant and excluded IDs;
- source path containment;
- source existence;
- exact byte size;
- SHA-256;
- resolved target vehicle ownership;
- deterministic tenant/vehicle Storage path.

The 253 source relations are deduplicated by vehicle plus physical hash into 252 physical objects and 252 `vehicle_images`. Attachment `57303` and excluded vehicles `4915/4927` cause an immediate manifest rejection if present.

If Storage fails, no relation success is reported. If Storage succeeds and relation persistence fails, the deterministic object remains identifiable; retry inspects size/hash, reuses it, and retries the atomic relation. Cleanup is available only for an exact owned path and is never applied to arbitrary existing objects.

## Checkpoints and resume

The persisted sequence is:

1. `PREFLIGHT_OK`
2. `RESET_DB_DONE`
3. `RESET_STORAGE_DONE`
4. `DATA_IMPORT_DONE`
5. `MEDIA_UPLOAD_DONE`
6. `MEDIA_RELATIONS_DONE`
7. `IMPORT_VERIFIED`

Database reset and data import are atomic RPC boundaries. Media retries are idempotent. The orchestrator resumes only from a recognized checkpoint and refuses compare-and-set drift or unsupported state.

## CLI safety

Safe invocation:

`npm run legacy-import -- --dry-run`

No arguments or contradictory modes print help and refuse. Execution additionally requires environment-only confirmations, opt-ins, a reviewed operation bundle path, and its exact SHA-256. Secrets are loaded server-side and are never accepted as CLI arguments or logged.

The new migration must be reviewed and applied separately before a future GO-0084B2 authorization. This ticket did not invoke `--execute`.

## Observability

Structured events contain phase, entity type, safe legacy external ID, status, reason, duration, and aggregate counts. Reporters never receive source payloads, customer email/phone, tokens, service-role credentials, or payment credentials.

## Tests

Failure-injection coverage includes:

- wrong tenant;
- wrong import/reset confirmation;
- missing opt-in;
- live payment;
- blocking REVIEW row;
- reset counter drift;
- missing media and hash mismatch;
- Storage upload failure;
- database relation failure after upload;
- deterministic retry;
- fingerprint conflict;
- cross-tenant media relation contract;
- checkpoint compare-and-set interruption;
- complete 1,027-identity first/second-pass simulation.

Validation results:

- `npm test`: PASS
- `npm run test:legacy-import`: PASS — 27 tests
- `npm run test:data-readiness`: PASS
- `npm run test:payments`: PASS
- `npm run test:registration`: PASS
- `npm run test:service-catalog`: PASS
- `npm run lint`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

## Real remote read-only dry-run

The CLI was run only with `--dry-run` against SAP.

| Check | Expected | Observed |
|---|---:|---:|
| Garage ID / slug | approved SAP / `sap` | match, enabled |
| Memberships | 2 | 2 |
| Payments total | 0 | 0 |
| Payments live | 0 | 0 |
| Blocking REVIEW rows | 0 | 0 |
| RESET database rows | 20 | 20 |
| RESET Storage objects | 16 | 16 |
| RESET Storage bytes | 2,906,181 | 2,906,181 |
| Manifest SHA-256 | `a49d6f6dd5d9fa91b80f62ca0f8535d39fc33c5ee960a50f65e9504fd6d1ae49` | match |
| Source media relations | 253 | 253 |
| Physical media | 252 | 252 |
| Migrations 48/49 | aligned | aligned |
| Migration 50 | local only | not applied remotely |

Remote mutations: 0. The approved source/count plan remains unchanged.

## Remaining blockers before renewed GO-0084B2 authorization

1. Review the local migration 50 and execution code.
2. Apply migration 50 only through a separately authorized migration step.
3. Generate and human-review the 774-operation payload bundle, then approve its SHA-256. The executor deliberately refuses execution without it.
4. Request a new GO-0084B2 authorization after another immutable read-only preflight.

## Final gates

- **EXECUTION REPOSITORY READY: YES**
- **RESET EXECUTOR READY: YES**
- **IMPORT EXECUTOR READY: YES**
- **MEDIA EXECUTOR READY: YES**
- **FAILURE RECOVERY READY: YES**
- **IDEMPOTENCE IMPLEMENTED: YES**
- **REMOTE DRY-RUN PASS: YES**

**GO-0084B2 EXECUTION LAYER READY: YES**

This readiness does not authorize GO-0084B2.

## GO-0084B1.6 SECURITY FINDINGS / RESOLUTION

The first B1.6 review failed and stopped before bundle authorization. Migration 50 had never been applied remotely, so GO-0084B1.7 hardened that same local migration rather than adding a corrective migration.

1. **RESET RPC allowlist** — The former regex/existence checks and denylist were insufficient for future tables. The RPC now accepts only the exact positive table/scope mapping classified `RESET` by the canonical GO-0082 manifest. Application validation uses that manifest directly, and a regression test parses the SQL allowlist and requires exact equality, so drift fails CI. KEEP, REVIEW, unknown, wrong-scope, and malformed resources are rejected.
2. **Customer vehicle tenant FK** — `vehicles(id, garage_id)` is now unique and `customer_vehicles(stock_vehicle_id, garage_id)` references that composite key. The import RPC independently verifies stock-vehicle ownership before insertion. A null stock vehicle remains valid.
3. **Storage path tenant boundary** — Both the media executor and media persistence RPC require the exact `<garage_id>/<vehicle_id>/...` prefix. Absolute, whitespace-mutated, backslash, duplicate-separator, dot-segment, percent-encoded, empty-suffix, and foreign-tenant paths are rejected.
4. **Checkpoint state machine** — The first durable state must be `PREFLIGHT_OK`; every later transition must be the immediate successor. Backward and skipped transitions fail. A retry of the same expected/next pair is idempotent. A transaction-scoped advisory lock plus row lock serializes concurrent callers, and checkpoint lookup no longer falls back to another execution ID.

The previous migration SHA-256 from the failed B1.6 review (`475e09b19cc6f01a530da73f658f74cd5972ff9a56d685d5bbdba07b75edeb0e`) is obsolete. The hardened migration SHA-256 is `086856878d916e1c49bef738a13926cbaf3d1670108ca31f2bb407d56be13d28`. Migration 50 remains local and unapplied.

Database mutations: 0
Storage mutations: 0
PayPlug calls: 0
Migration pushes: 0
Commits: 0
