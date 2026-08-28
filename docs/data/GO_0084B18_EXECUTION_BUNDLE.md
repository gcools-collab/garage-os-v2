# GO-0084B1.8 — SAP execution bundle materialization

Local generation review performed on 25 August 2026. No GO-0084B2 operation, remote mutation, reset, upload, deletion, migration push, PayPlug call, or commit occurred.

## Immutable inputs

- Target garage: `363f2dc0-bfd3-48d6-a1cc-96e113e96094`
- Migration 50 SHA-256: `086856878d916e1c49bef738a13926cbaf3d1670108ca31f2bb407d56be13d28` (unchanged)
- Media manifest SHA-256: `a49d6f6dd5d9fa91b80f62ca0f8535d39fc33c5ee960a50f65e9504fd6d1ae49`

## Bundle contract and builder

The execution contract remains `{ garageId, operations }`. Structured operations are tenant-scoped, deterministically ordered, assigned deterministic UUIDs, fingerprinted from stable canonical JSON, and validated for duplicate ledger/business identities. The builder reuses the existing WXR parser and legacy normalizers and parses only the validated SQL source tables required for customers, bookings, orders, billing snapshots, payments, and Elementor submissions.

Media bytes and media operations are not embedded in the structured bundle. The existing executor consumes the separately approved media manifest, and each accepted source relation creates its own `legacy_import_records` identity.

## Materialization blocker

No final bundle was written. Generation correctly stopped at legacy booking `3795`, linked to order `3794`.

Demonstrated source facts, without exposing PII:

- booking status is historically eligible (`bk-paid`);
- its order exists and is completed;
- the order has no billing email and no customer identifier;
- no billing address row exists;
- no customer lookup identity exists;
- booking notes contain neither an email nor a phone number.

At the end of B1.8, the target `appointments` table still required a non-empty `customer_name` and at least one of `customer_phone` or `customer_email`, including for `is_historical=true`. The builder therefore failed closed with `LEGACY_APPOINTMENT_CONTACT_MISSING:3795` rather than creating a partial or misleading bundle. GO-0084B1.9 resolves this with the separately reviewed migration 51; migration 50 remains unchanged.

## Media verification

- Relations: 253
- Physical files: 252
- Physical bytes: 60,965,685
- Primary coverage: 19/19
- Missing/size/hash failures: 0
- Excluded attachment `57303`: absent
- Excluded vehicles `4915` and `4927`: absent

## Current result

- Bundle path: not materialized
- Bundle SHA-256: unavailable
- Total operations: unavailable because generation is atomic and rejected
- Expected structured count if the schema conflict is resolved without changing scope: 774
- Expected ledger under the approved semantics: 1,027 (`774` structured identities plus `253` media source identities)

These expected totals are not presented as an artifact result. They remain blocked until all 495 appointments can be represented truthfully and the resulting bundle is generated twice byte-identically and accepted by the real CLI parser in dry-run mode.

## Required decision before continuation

The finalized artifact, hashes, dry-run and narrow historical exception are documented in `GO_0084B19_HISTORICAL_APPOINTMENT.md`.
