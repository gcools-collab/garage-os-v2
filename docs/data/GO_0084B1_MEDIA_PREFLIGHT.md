# GO-0084B1-FINAL — Human decisions and remote preflight

Final preflight performed on 24 August 2026. This document is the authoritative GO-0084B1 plan. It does not execute GO-0084B2 and records zero database, Storage, PayPlug, reset, import, upload, deletion, or migration mutations.

## Human decisions applied

- Vehicles `4915` (Austin Mini 1000 Jet Black) and `4927` (Skoda Octavia Break) are excluded from automatic import. No vehicle, image, media relation, ledger row, price, mileage, or status is planned for them.
- Customers `WOOCOMMERCE_CUSTOMER_LOOKUP:5` and `WOOCOMMERCE_CUSTOMER_LOOKUP:6` are not created. The valid history `3794/3795` remains eligible with a nullable customer relation; both `appointments.customer_id` and `historical_payments.customer_id` permit `NULL`.
- The automatic payment scope is 55 demonstrated encashments totalling EUR 3,421.00.
- Order `5112` (`wc-refunded`, cancelled booking, EUR 79.80) is not an encashment and is excluded from automatic import. The current historical table can preserve `source_status=wc-refunded`, provider, external IDs, and the original positive amount, but cannot model the refund event, refund date, or signed reversal separately. Automatic preservation would therefore be semantically incomplete; it remains documented for later historical enrichment.
- The legacy service “Démarches d’immatriculation” is not mapped to `REGISTRATION_APPOINTMENT`. Historical appointments remain importable without this inferred catalogue mapping, using the neutral appointment classification supported by the target model where required.

## Final media reconciliation — included vehicles only

The deterministic manifest is stored locally at `.local/legacy/go-0084b1-final-media-manifest.json` and is ignored by Git.

| Counter | Final value |
|---|---:|
| Included vehicles | 18 |
| Excluded vehicles | 3 |
| Logical source media relations | 243 |
| Unique attachment IDs | 243 |
| Unique physical files | 242 |
| Primary images resolved | 18/18 |
| Missing | 0 |
| Ambiguous | 0 |
| Selected bytes | 58,681,664 |
| Duplicate hashes across distinct physical paths | 0 |
| Planned physical uploads | 242 |
| Planned `vehicle_images` relations | 242 |
| Planned `legacy_media_references` relations | 243 |

The remaining difference between 253 source relations and 252 physical files is internal to included vehicle `4684`: attachments `7384` and `4687` resolve to the same physical Berlingo image. Both source references remain traceable, but only one physical upload and one `vehicle_images` relation are planned.

### Media removed by the human exclusions

- Vehicle `4915`: one primary relation using attachment `57303`.
- Vehicle `4927`: one primary relation using attachment `57303`.
- Removed from the previous 21-vehicle manifest: 2 vehicles, 2 logical relations, 1 unique attachment, 1 unique physical file, 2 primary assignments, and 66,612 bytes.
- Attachment `57303` has no reference from any included entity and is not planned for upload or import.

Vehicle `6054` is additionally excluded by human decision because its source represents two available vehicles with a mileage range. This removes 10 logical relations, 10 unique physical files, one primary assignment, and 2,284,021 bytes. None of its media hashes is shared with another included vehicle. Vehicle `43878` remains included with all 11 approved relations.

Two consecutive source scans and 18-vehicle manifest generations produced the same file SHA-256:

`c58a6603e8269cc49a2649640e1b4c06ab1dbccf025b8837af9f806fe4334143`

## Final remote read-only preflight

Garage scope: `363f2dc0-bfd3-48d6-a1cc-96e113e96094` (`live_slug=sap`, enabled).

| Check | Current result |
|---|---:|
| SAP memberships | 2 |
| Payments total | 0 |
| Payments with `is_live=true` | 0 |
| REVIEW `legacy_import_records` | 0 |
| REVIEW `historical_payments` | 0 |
| REVIEW `legacy_media_references` | 0 |
| REVIEW `customer_vehicles` | 0 |
| REVIEW `customers` | 0 |
| REVIEW `payments` | 0 |
| Existing legacy customers/customer vehicles/vehicles/appointments/leads | 0 |
| Existing historical/media/import legacy rows | 0 |

### Current RESET database rows

| Table | Rows |
|---|---:|
| `copilot_conversations` | 2 |
| `acquisition_opportunities` | 1 |
| `acquisition_sellers` | 1 |
| `vehicle_images` | 10 |
| `vehicle_market_analyses` | 2 |
| `marketplace_links` | 2 |
| `vehicles` | 2 |
| All other RESET tables | 0 |
| **Total RESET rows** | **20** |

Indirect vehicle-owned counts were resolved only from the two vehicle IDs belonging to the SAP garage. Direct counts used `garage_id`; Storage counts used the exact tenant prefix. No garage was resolved by name.

### Current RESET Storage objects

| Bucket | Objects | Bytes |
|---|---:|---:|
| `vehicle-images` | 16 | 2,906,181 |
| All other RESET buckets | 0 | 0 |
| **Total** | **16** | **2,906,181** |

### Foundations and backup

- Remote migrations `20260817000048` and `20260817000049` match their local versions and remain applied.
- Backup `.local/backups/go-0084b1-20260817-134000` remains present and is still selected by `.local/backups/.current`.
- Backup data snapshot: 33,107 bytes; manifest: 6,335 bytes; 16 Storage files totalling 2,906,181 bytes.
- `schema-public.sql` is empty because the linked schema dump did not produce schema content; the applied migration chain remains the schema source of truth. The tenant data and Storage backup artifacts required for this scoped reset are present.
- No unexpected legacy import row exists remotely.
- Tenant isolation assumptions remain valid: all direct operations are constrained by the SAP `garage_id`, indirect rows by SAP-owned vehicle IDs, and Storage by `363f2dc0-bfd3-48d6-a1cc-96e113e96094/`.

## Exact future GO-0084B2 dry-run plan

This is a plan only; none of these operations has been executed.

| Planned operation | First run | Second identical run |
|---|---:|---:|
| One-time pre-import RESET database rows | 20 deleted | Not rerun |
| One-time pre-import RESET Storage objects | 16 deleted | Not rerun |
| Customers | 84 `CREATE` | 84 `SKIPPED` |
| Customer vehicles | 0 | 0 |
| Vehicles | 19 `CREATE` | 19 `SKIPPED` |
| Appointments | 495 `CREATE` | 495 `SKIPPED` |
| Historical payments | 55 `CREATE` | 55 `SKIPPED` |
| Leads | 121 `CREATE` | 121 `SKIPPED` |
| Physical media uploads | 252 | 0; 252 existing paths/hashes reused |
| Logical source media relations | 253 `CREATE` | 253 `SKIPPED` |
| Final `vehicle_images` relations | 252 `CREATE` | 252 `SKIPPED` |
| Ledger entries | 1,027 `CREATE` | 1,027 `SKIPPED` |

The 1,027 ledger entries are exactly 84 customers + 19 vehicles + 495 appointments + 55 historical payments + 121 leads + 253 accepted source media relations. No ledger entry is planned for excluded customers, vehicles, attachment `57303`, or refunded order `5112`.

Idempotence relies on tenant-scoped source/external IDs, immutable fingerprints, deterministic media paths, and hash comparison. The simulated second run is a second execution of the importer after the first commit, without repeating the one-time reset. It produces no CREATE, upload, or delete; a changed fingerprint/path becomes a conflict rather than an overwrite. Re-executing the full reset after importing real legacy data is outside this simulation and must be refused by the REVIEW-table safety gate.

## Final gates

- **REMOTE SAFETY READY: YES**
- **DATA IMPORT READY: YES**
- **MEDIA IMPORT READY: YES**
- **MANUAL REVIEW COMPLETE: YES**
- **GO-0084B2 READY: YES**

Human-excluded items do not block GO-0084B2. No unresolved integrity or safety issue remains in the automatic scope.

Database mutations: 0
Storage mutations: 0
PayPlug calls: 0
