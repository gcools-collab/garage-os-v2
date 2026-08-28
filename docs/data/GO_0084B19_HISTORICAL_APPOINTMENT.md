# GO-0084B1.9 — Historical appointment without contact

## Schema decision

Migration 51 allows `customer_name`, `customer_email`, `customer_phone` and `customer_id` to remain `NULL` only when `appointments.is_historical = true`. The existing operational rules remain enforced by checks: a non-historical appointment requires a trimmed name of 2–160 characters and at least one non-null contact channel. No policy, grant, tenant boundary, payment behavior or public booking function changes.

Migration 50 is unchanged. Its approved SHA-256 remains `086856878d916e1c49bef738a13926cbaf3d1670108ca31f2bb407d56be13d28`. Migration 51 SHA-256 is `2dca87aa4b7c8cdd0ec72552cc757bcc63edc845e7c236acd081b659f525e2ac`.

## Historical record

`YITH/APPOINTMENT/BOOKING:3795` is included as an explicitly historical completed appointment. Its payload contains no `customer_id`, `customer_name`, `customer_email` or `customer_phone`. The real legacy status and linked order identifier remain in historical details. It creates no customer and performs no empty-value matching.

The scheduling repository now reads `is_historical`, its row type represents nullable historical contact, and presentation builders show `Contact non disponible` only at display time. Public booking input and RPC behavior are unchanged.

## Immutable execution bundle

The real artifact is stored in ignored local storage at `.local/legacy/go-0084b2-execution-bundle.json`. Two independent builds produced identical bytes and SHA-256:

`2e9bbfbc2816c47e8e079de74f8bd6422dfdcd6844150864451caa7792fbab2a`

Local runtime configuration is recorded in the ignored `.local/legacy/go-0084b2-execution-bundle.env` file:

- `GARAGE_OS_LEGACY_IMPORT_BUNDLE`
- `GARAGE_OS_LEGACY_IMPORT_BUNDLE_SHA256`

The bundle contains 774 structured operations: 84 customers, 0 customer vehicles, 19 vehicles, 495 appointments, 55 historical payments and 121 leads. Historical payment amount is 342,100 cents. The 253 traceable media relations are separate executor identities, yielding an expected ledger count of 1,027. The approved media manifest SHA-256 remains `a49d6f6dd5d9fa91b80f62ca0f8535d39fc33c5ee960a50f65e9504fd6d1ae49`.

The same parser used by execution validates bundle hash, tenant, targets, fingerprints, duplicates, appointment contact invariants and cardinalities in both dry-run and execute modes. The administrative dry-run matched the approved reset counters (20 rows; 16 objects; 2,906,181 bytes), reported no blockers, and performed zero database or Storage mutations.
