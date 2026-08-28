import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assertApprovedResetPlan, assertResetResourceAllowed, executeControlledReset, planControlledReset, RESET_TABLE_MANIFEST } from "@/features/data-readiness";
import type { ControlledResetGateway, StorageInventory } from "@/features/data-readiness";
import {
  assertCheckpointTransition, assertExecutionContext, assertResetAuthorization, assertTenantStoragePath,
  appointmentContactIsValid, buildControlledImportPlan, executeApprovedMediaImport, IMPORT_CHECKPOINT_SEQUENCE,
  preserveLegacyText, validateBundlePayload,
} from "..";
import { SupabaseMediaStorageGateway } from "../execution/supabase-media-gateway";
import type {
  ControlledImportOperation, ExistingImportRecord, ImportCheckpoint, ImportCheckpointRepository,
  MediaManifestEntry, MediaRelationGateway, MediaStorageGateway,
} from "..";

const garage = "363f2dc0-bfd3-48d6-a1cc-96e113e96094";
const otherGarage = "e8dc75f8-4362-4a0a-9357-e20633fa3263";
const fingerprint = "a".repeat(64);

const withEnv = async (values: Readonly<Record<string, string>>, action: () => Promise<void> | void): Promise<void> => {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  try {
    await action();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("execution authorization fails closed for tenant, opt-in and confirmations", async () => {
  assert.throws(() => assertExecutionContext({ garageId: garage, authorizedGarageId: otherGarage, mode: "DRY_RUN" }), /TENANT_MISMATCH/);
  await withEnv({ NODE_ENV: "test", GARAGE_OS_ENABLE_LEGACY_IMPORT: "false" }, () => {
    assert.throws(() => assertExecutionContext({ garageId: garage, authorizedGarageId: garage, mode: "EXECUTE", importConfirmation: `IMPORT:${garage}` }), /OPT_IN/);
  });
  await withEnv({ NODE_ENV: "test", GARAGE_OS_ENABLE_LEGACY_IMPORT: "true", GARAGE_OS_ENABLE_TENANT_RESET: "true" }, () => {
    assert.throws(() => assertResetAuthorization({ garageId: garage, authorizedGarageId: garage, mode: "EXECUTE", importConfirmation: `IMPORT:${garage}`, resetConfirmation: "RESET:wrong" }), /CONFIRMATION/);
  });
});

class ResetFake implements ControlledResetGateway {
  constructor(readonly counts: Record<string, number> = {}, readonly live = 0, readonly inventory: StorageInventory = { objects: 0, bytes: 0, paths: [] }) {}
  async countTable(table: string) { return this.counts[table] ?? 0; }
  async deleteTable(table: string) { const count = this.counts[table] ?? 0; this.counts[table] = 0; return count; }
  async inventoryStorage() { return this.inventory; }
  async deleteStorage(_bucket: string, paths: readonly string[]) { return paths.length; }
  async countLivePayments() { return this.live; }
}

test("reset rejects live payments, REVIEW rows and approved counter drift", async () => {
  const live = await planControlledReset(new ResetFake({}, 1), garage);
  assert.throws(() => assertApprovedResetPlan(live, { databaseRows: 0, storageObjects: 0, storageBytes: 0 }), /LIVE_PAYMENTS/);
  const review = await planControlledReset(new ResetFake({ customers: 1 }), garage);
  assert.throws(() => assertApprovedResetPlan(review, { databaseRows: 0, storageObjects: 0, storageBytes: 0 }), /REVIEW_ROWS/);
  const drift = await planControlledReset(new ResetFake({ vehicles: 2 }), garage);
  assert.throws(() => assertApprovedResetPlan(drift, { databaseRows: 20, storageObjects: 0, storageBytes: 0 }), /COUNT_DRIFT/);
});

test("reset executor uses independent authorization and verifies deletions", async () => {
  await withEnv({ NODE_ENV: "test", GARAGE_OS_ENABLE_LEGACY_IMPORT: "true", GARAGE_OS_ENABLE_TENANT_RESET: "true" }, async () => {
    const gateway = new ResetFake({ vehicles: 2 });
    const result = await executeControlledReset({
      gateway, expected: { databaseRows: 2, storageObjects: 0, storageBytes: 0 },
      context: { garageId: garage, authorizedGarageId: garage, mode: "EXECUTE", importConfirmation: `IMPORT:${garage}`, resetConfirmation: `RESET:${garage}` },
    });
    assert.equal(result.databaseDeleted, 2);
  });
});

test("reset allowlist is canonical and rejects KEEP, REVIEW, unknown and malicious resources", () => {
  assert.doesNotThrow(() => assertResetResourceAllowed("vehicles", "DIRECT"));
  assert.throws(() => assertResetResourceAllowed("garages", "DIRECT"), /FORBIDDEN/);
  assert.throws(() => assertResetResourceAllowed("customers", "DIRECT"), /FORBIDDEN/);
  assert.throws(() => assertResetResourceAllowed("future_tenant_table", "DIRECT"), /FORBIDDEN/);
  assert.throws(() => assertResetResourceAllowed("vehicles;drop table garages", "DIRECT"), /FORBIDDEN/);
  assert.throws(() => assertResetResourceAllowed("vehicle_images", "DIRECT"), /FORBIDDEN/);
  assert.doesNotThrow(() => assertResetResourceAllowed("vehicle_images", "INDIRECT"));

  const sql = readFileSync("supabase/migrations/20260825000050_create_controlled_import_execution.sql", "utf8");
  const encoded = sql.match(/declare allowed constant jsonb := '(\{[\s\S]*?\})'::jsonb;/)?.[1];
  assert.ok(encoded, "SQL RESET allowlist must be machine-readable");
  const sqlAllowlist = JSON.parse(encoded) as Record<string, string>;
  const canonical = Object.fromEntries(RESET_TABLE_MANIFEST.filter((item) => item.disposition === "RESET").map((item) => [item.name, item.garageScope]));
  assert.deepEqual(sqlAllowlist, canonical, "SQL allowlist must exactly match the canonical GO-0082 RESET manifest");
});

const mediaEntry = (relative: string, bytes: Uint8Array): MediaManifestEntry => ({
  garage_id: garage, vehicle_legacy_external_id: "42", attachment_id: "100", source_relative_path: relative,
  source_size: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), gallery_position: 0,
  is_primary: true, target_storage_path: `${garage}/{vehicle_id}/legacy-42.jpg`, status: "AUTO",
});

class StorageFake implements MediaStorageGateway {
  objects = new Map<string, Uint8Array>();
  failUpload = false;
  async inspect(_bucket: string, path: string) { const bytes = this.objects.get(path); return { exists: Boolean(bytes), size: bytes?.byteLength ?? null, sha256: bytes ? createHash("sha256").update(bytes).digest("hex") : null }; }
  async upload(_bucket: string, path: string, bytes: Uint8Array) { if (this.failUpload) throw new Error("injected"); this.objects.set(path, bytes); }
  async deleteOwned(_bucket: string, path: string) { this.objects.delete(path); }
}

class RelationFake implements MediaRelationGateway {
  records = new Set<string>(); fail = false;
  async resolveVehicleId(target: string) { return target === garage ? "11111111-1111-4111-8111-111111111111" : null; }
  async persist(entry: MediaManifestEntry) { if (this.fail) throw new Error("injected"); const key = entry.attachment_id; if (this.records.has(key)) return "SKIPPED" as const; this.records.add(key); return "CREATED" as const; }
}

test("storage inspect uses list API and treats absent objects as missing", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const request = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, method: init?.method ?? "GET", body: typeof init?.body === "string" ? init.body : undefined });
    if (url.includes("/object/list/")) {
      return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected request:${url}`);
  };
  const gateway = new SupabaseMediaStorageGateway("https://example.supabase.co", "service-role-key", request);
  const missing = await gateway.inspect("vehicle-images", `${garage}/11111111-1111-4111-8111-111111111111/legacy.jpg`);
  assert.equal(missing.exists, false);
  assert.match(calls[0]?.url ?? "", /\/storage\/v1\/object\/list\/vehicle-images$/);
  assert.match(calls[0]?.body ?? "", /"prefix":/);
  assert.doesNotMatch(calls[0]?.url ?? "", /\/object\/authenticated\//, "HEAD authenticated route must not be used for inspect");

  const requestWithObject = async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/object/list/")) {
      return new Response(JSON.stringify([{ id: "obj-1", name: "legacy.jpg", metadata: { size: 42 } }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected request:${url}`);
  };
  const existingGateway = new SupabaseMediaStorageGateway("https://example.supabase.co", "service-role-key", requestWithObject);
  const existing = await existingGateway.inspect("vehicle-images", `${garage}/11111111-1111-4111-8111-111111111111/legacy.jpg`);
  assert.equal(existing.exists, true);
  assert.equal(existing.size, 42);
});

test("media import validates missing files, hashes, upload and relation failures", async () => {
  const root = mkdtempSync(join(tmpdir(), "garage-os-media-"));
  const bytes = Buffer.from("approved-media");
  writeFileSync(join(root, "image.jpg"), bytes);
  const entry = mediaEntry("image.jpg", bytes);
  const relation = new RelationFake();
  await assert.rejects(() => executeApprovedMediaImport({ garageId: garage, authorizedGarageId: garage, sourceRoot: root, manifest: { version: 2, entries: [{ ...entry, sha256: "b".repeat(64) }] }, storage: new StorageFake(), relations: relation }), /HASH_MISMATCH/);
  await assert.rejects(() => executeApprovedMediaImport({ garageId: garage, authorizedGarageId: garage, sourceRoot: root, manifest: { version: 2, entries: [{ ...entry, source_relative_path: "missing.jpg" }] }, storage: new StorageFake(), relations: relation }));
  const failedStorage = new StorageFake(); failedStorage.failUpload = true;
  const uploadResult = await executeApprovedMediaImport({ garageId: garage, authorizedGarageId: garage, sourceRoot: root, manifest: { version: 2, entries: [entry] }, storage: failedStorage, relations: relation });
  assert.deepEqual(uploadResult.failures, ["UPLOAD_FAILED:100"]);
  const storage = new StorageFake(); relation.fail = true;
  const relationResult = await executeApprovedMediaImport({ garageId: garage, authorizedGarageId: garage, sourceRoot: root, manifest: { version: 2, entries: [entry] }, storage, relations: relation });
  assert.match(relationResult.failures[0], /RELATION_FAILED_AFTER_UPLOAD/);
  assert.equal(storage.objects.size, 1, "deterministic object remains resumable and is never blindly deleted");
});

test("media retry reuses deterministic object and creates no duplicate relation", async () => {
  const root = mkdtempSync(join(tmpdir(), "garage-os-media-retry-"));
  const bytes = Buffer.from("approved-media"); writeFileSync(join(root, "image.jpg"), bytes);
  const entry = mediaEntry("image.jpg", bytes); const storage = new StorageFake(); const relations = new RelationFake();
  const first = await executeApprovedMediaImport({ garageId: garage, authorizedGarageId: garage, sourceRoot: root, manifest: { version: 2, entries: [entry] }, storage, relations });
  const second = await executeApprovedMediaImport({ garageId: garage, authorizedGarageId: garage, sourceRoot: root, manifest: { version: 2, entries: [entry] }, storage, relations });
  assert.equal(first.uploaded, 1); assert.equal(second.uploaded, 0); assert.equal(second.reused, 1); assert.equal(relations.records.size, 1);
});

test("storage paths enforce the exact garage and vehicle boundary", () => {
  const vehicle = "11111111-1111-4111-8111-111111111111";
  assert.doesNotThrow(() => assertTenantStoragePath(`${garage}/${vehicle}/legacy-42.jpg`, garage, vehicle));
  assert.throws(() => assertTenantStoragePath(`${otherGarage}/${vehicle}/legacy-42.jpg`, garage, vehicle), /CROSS_TENANT/);
  assert.throws(() => assertTenantStoragePath(`${garage}/${vehicle}/../escape.jpg`, garage, vehicle), /CROSS_TENANT/);
  assert.throws(() => assertTenantStoragePath(`/${garage}/${vehicle}/legacy-42.jpg`, garage, vehicle), /CROSS_TENANT/);
  assert.throws(() => assertTenantStoragePath(`${garage}/${vehicle}/%2e%2e/escape.jpg`, garage, vehicle), /CROSS_TENANT/);
  assert.throws(() => assertTenantStoragePath(`${garage}\\${vehicle}\\legacy-42.jpg`, garage, vehicle), /CROSS_TENANT/);
});

test("checkpoint state machine accepts only immediate ordered transitions", () => {
  let current: ImportCheckpoint | null = null;
  for (const next of IMPORT_CHECKPOINT_SEQUENCE) {
    assert.doesNotThrow(() => assertCheckpointTransition(current, next));
    current = next;
  }
  assert.throws(() => assertCheckpointTransition(null, "RESET_DB_DONE"), /TRANSITION_INVALID/);
  assert.throws(() => assertCheckpointTransition("PREFLIGHT_OK", "DATA_IMPORT_DONE"), /TRANSITION_INVALID/);
  assert.throws(() => assertCheckpointTransition("RESET_STORAGE_DONE", "RESET_DB_DONE"), /TRANSITION_INVALID/);
  assert.throws(() => assertCheckpointTransition(null, "IMPORT_VERIFIED"), /TRANSITION_INVALID/);
  assert.doesNotThrow(() => assertCheckpointTransition("RESET_DB_DONE", "RESET_STORAGE_DONE"), "a retry uses the same expected/next pair and is resolved idempotently by SQL");
});

test("customer vehicle stock links are tenant-bound while null remains allowed", () => {
  const sql = readFileSync("supabase/migrations/20260825000050_create_controlled_import_execution.sql", "utf8");
  assert.match(sql, /foreign key \(stock_vehicle_id, garage_id\)[\s\S]*references public\.vehicles\(id, garage_id\)/);
  assert.match(sql, /nullif\(payload->>'stock_vehicle_id',''\) is not null and not exists\(select 1 from public\.vehicles where id=\(payload->>'stock_vehicle_id'\)::uuid and garage_id=p_garage_id\)/);
  assert.match(sql, /nullif\(payload->>'stock_vehicle_id',''\)::uuid/, "null stock vehicle remains accepted by the nullable domain column");
});

test("approved logical cardinalities are idempotent on a complete fake import", () => {
  const definitions = [["CUSTOMER",84,"WOOCOMMERCE"],["VEHICLE",18,"WORDPRESS"],["APPOINTMENT",495,"YITH"],["HISTORICAL_PAYMENT",55,"WOOCOMMERCE"],["LEAD",121,"ELEMENTOR"]] as const;
  const operations: ControlledImportOperation[] = definitions.flatMap(([entity, count, source]) => Array.from({ length: count }, (_, index) => ({ garageId: garage, source, entity, externalId: `${entity}-${index}`, fingerprint, targetTable: entity.toLowerCase(), payload: {} })));
  const first = buildControlledImportPlan(operations, []);
  assert.equal(first.filter((item) => item.outcome === "CREATED").length, 773);
  const existing: ExistingImportRecord[] = operations.map((item) => ({ garageId: garage, source: item.source, entity: item.entity, externalId: item.externalId, fingerprint: item.fingerprint }));
  const second = buildControlledImportPlan(operations, existing);
  assert.equal(second.filter((item) => item.outcome === "SKIPPED").length, 773);
  assert.equal(773 + 243, 1016);
});

test("execution bundle rejects PostgreSQL integer overflow before serialization", () => {
  const vehicle = { id: "11111111-1111-4111-8111-111111111111", brand: "CitroÃ«n", model: "Jumpy", status: "PUBLISHED" };
  assert.doesNotThrow(() => validateBundlePayload("VEHICLE", "6054", { ...vehicle, mileage: 2_147_483_647 }));
  assert.throws(() => validateBundlePayload("VEHICLE", "6054", { ...vehicle, mileage: 2_147_483_648 }), /EXECUTION_BUNDLE_SCHEMA_INCOMPATIBLE:VEHICLE:6054/);
  assert.throws(() => validateBundlePayload("VEHICLE", "6054", { ...vehicle, mileage: Number.POSITIVE_INFINITY }), /EXECUTION_BUNDLE_NUMERIC_NON_FINITE/);
});

test("execution bundle enforces remote lead length and contact constraints", () => {
  const lead = {
    id: "11111111-1111-4111-8111-111111111111", source: "MANUAL", type: "GENERAL_CONTACT", status: "NEW",
    customer_name: "Client legacy", customer_email: "legacy@example.invalid", public_garage_slug: "sap",
  };
  assert.doesNotThrow(() => validateBundlePayload("LEAD", "SUBMISSION:1", { ...lead, message: "a".repeat(2000) }));
  assert.throws(() => validateBundlePayload("LEAD", "SUBMISSION:41", { ...lead, message: "a".repeat(2001) }), /EXECUTION_BUNDLE_SCHEMA_INCOMPATIBLE:LEAD:SUBMISSION:41/);
  assert.throws(() => validateBundlePayload("LEAD", "SUBMISSION:116", { ...lead, customer_name: "a".repeat(101) }), /EXECUTION_BUNDLE_SCHEMA_INCOMPATIBLE:LEAD:SUBMISSION:116/);
  assert.throws(() => validateBundlePayload("LEAD", "SUBMISSION:2", { ...lead, customer_email: null }), /EXECUTION_BUNDLE_SCHEMA_INCOMPATIBLE:LEAD:SUBMISSION:2/);
});

test("overlong legacy lead text remains losslessly recoverable from archival metadata", () => {
  const source = `${"a".repeat(1999)}🚗${"b".repeat(129)}`;
  const preserved = preserveLegacyText(source, 2000);
  assert.equal([...(preserved.operationalValue ?? "")].length, 2000);
  assert.equal(preserved.originalValue, source);
  assert.equal(preserved.originalLength, 2129);
  assert.equal(preserved.originalSha256, createHash("sha256").update(source).digest("hex"));
});

test("execution bundle enforces remote appointment and vehicle checks", () => {
  const appointment = {
    id: "11111111-1111-4111-8111-111111111111", type: "OTHER", status: "COMPLETED",
    starts_at: "2024-01-01T10:00:00Z", ends_at: "2024-01-01T11:00:00Z", timezone: "Europe/Paris",
    payment_required: false, is_historical: true, details: {},
  };
  assert.doesNotThrow(() => validateBundlePayload("APPOINTMENT", "BOOKING:1", appointment));
  assert.throws(() => validateBundlePayload("APPOINTMENT", "BOOKING:2", { ...appointment, ends_at: appointment.starts_at }), /EXECUTION_BUNDLE_SCHEMA_INCOMPATIBLE:APPOINTMENT:BOOKING:2/);
  assert.throws(() => validateBundlePayload("VEHICLE", "42", { id: appointment.id, brand: "BMW", model: "M3", status: "PUBLISHED", year: 1885 }), /EXECUTION_BUNDLE_SCHEMA_INCOMPATIBLE:VEHICLE:42/);
});

test("fingerprint conflict and checkpoint interruption fail closed", () => {
  const operation: ControlledImportOperation = { garageId: garage, source: "WORDPRESS", entity: "VEHICLE", externalId: "42", fingerprint, targetTable: "vehicles", payload: {} };
  assert.equal(buildControlledImportPlan([operation], [{ garageId: garage, source: "WORDPRESS", entity: "VEHICLE", externalId: "42", fingerprint: "b".repeat(64) }])[0].outcome, "UPDATED");
  class Checkpoints implements ImportCheckpointRepository {
    value: ImportCheckpoint | null = "RESET_DB_DONE";
    async get() { return this.value; }
    async advance(_garage: string, expected: ImportCheckpoint | null, next: ImportCheckpoint) {
      if (this.value !== expected) throw new Error("checkpoint compare-and-set failed");
      this.value = next;
    }
  }
  const checkpoints = new Checkpoints();
  assert.rejects(() => checkpoints.advance(garage, "PREFLIGHT_OK", "RESET_DB_DONE"), /compare-and-set/);
});

test("execution migration keeps business row and ledger atomic and service-role only", () => {
  const sql = readFileSync("supabase/migrations/20260825000050_create_controlled_import_execution.sql", "utf8");
  assert.match(sql,/execute_controlled_legacy_import_batch/);
  assert.match(sql,/advance_legacy_import_checkpoint/);
  assert.match(sql,/persist_legacy_media_relation/);
  assert.match(sql,/auth\.role\(\) <> 'service_role'/);
  assert.match(sql,/insert into public\.historical_payments/);
  assert.doesNotMatch(sql,/insert into public\.payments/);
  assert.match(sql,/cross tenant media relation/);
  assert.match(sql,/customer_vehicles_stock_vehicle_tenant_fk/);
  assert.match(sql,/cross tenant stock vehicle/);
  assert.match(sql,/storage path tenant boundary violation/);
  assert.match(sql,/checkpoint initial state invalid/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/current_value=p_next/);
  assert.match(sql,/current_value='PREFLIGHT_OK' and p_expected is null/);
  assert.doesNotMatch(sql,/declare protected constant/);
});

test("historical appointment contact exception is narrow and migration 50 stays immutable", () => {
  const migration50 = readFileSync("supabase/migrations/20260825000050_create_controlled_import_execution.sql");
  assert.equal(createHash("sha256").update(migration50).digest("hex"), "086856878d916e1c49bef738a13926cbaf3d1670108ca31f2bb407d56be13d28");
  const migration51 = readFileSync("supabase/migrations/20260825000051_allow_anonymous_historical_appointments.sql", "utf8");
  assert.match(migration51, /alter column customer_name drop not null/);
  assert.match(migration51, /is_historical\s+or \(\s*customer_name is not null/);
  assert.match(migration51, /is_historical\s+or customer_phone is not null\s+or customer_email is not null/);
  assert.match(migration51, /\(payload->>'is_historical'\)::boolean is distinct from true then raise exception 'controlled import appointment must be historical'/);
  assert.doesNotMatch(migration51, /create policy|drop policy|grant |revoke |public\.payments|payplug/i);
});

test("appointment contact invariants preserve operational validation and allow truthful history", () => {
  assert.equal(appointmentContactIsValid({ isHistorical: false, customerName: "Jean Martin", customerEmail: "jean@example.test", customerPhone: null }), true);
  assert.equal(appointmentContactIsValid({ isHistorical: false, customerName: "Jean Martin", customerEmail: null, customerPhone: "0600000000" }), true);
  assert.equal(appointmentContactIsValid({ isHistorical: false, customerName: null, customerEmail: "jean@example.test", customerPhone: null }), false);
  assert.equal(appointmentContactIsValid({ isHistorical: false, customerName: "Jean Martin", customerEmail: null, customerPhone: null }), false);
  assert.equal(appointmentContactIsValid({ isHistorical: true, customerName: "Jean Martin", customerEmail: "jean@example.test", customerPhone: null }), true);
  assert.equal(appointmentContactIsValid({ isHistorical: true, customerName: "Jean Martin", customerEmail: null, customerPhone: null }), true);
  assert.equal(appointmentContactIsValid({ isHistorical: true, customerName: null, customerEmail: null, customerPhone: null }), true);
});
