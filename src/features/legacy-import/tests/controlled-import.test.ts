import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertControlledImportOrder, buildControlledImportPlan, CONTROLLED_IMPORT_PHASES, executeControlledImport, preflightControlledImport } from "..";
import type { ControlledImportOperation, ControlledImportRepository } from "..";

const garageA = "363f2dc0-bfd3-48d6-a1cc-96e113e96094";
const garageB = "e8dc75f8-4362-4a0a-9357-e20633fa3263";
const fingerprintA = "a".repeat(64);
const fingerprintB = "b".repeat(64);
const operation = (overrides: Partial<ControlledImportOperation> = {}): ControlledImportOperation => ({
  garageId: garageA, source: "WORDPRESS", entity: "CUSTOMER", externalId: "42", fingerprint: fingerprintA,
  targetTable: "customers", payload: { firstName: "Fixture" }, ...overrides,
});

test("preflight is idempotent and performs no mutation", () => {
  const created = buildControlledImportPlan([operation()], []);
  assert.equal(created[0].outcome, "CREATED");
  const skipped = buildControlledImportPlan([operation()], [{ garageId: garageA, source: "WORDPRESS", entity: "CUSTOMER", externalId: "42", fingerprint: fingerprintA }]);
  assert.equal(skipped[0].outcome, "SKIPPED");
  const updated = buildControlledImportPlan([operation({ fingerprint: fingerprintB })], [{ garageId: garageA, source: "WORDPRESS", entity: "CUSTOMER", externalId: "42", fingerprint: fingerprintA }]);
  assert.equal(updated[0].outcome, "UPDATED");
  assert.deepEqual(preflightControlledImport(garageA, skipped), { garageId: garageA, mode: "PREFLIGHT", results: { CREATED: 0, UPDATED: 0, SKIPPED: 1, CONFLICT: 0, FAILED: 0 }, databaseMutations: 0, storageMutations: 0 });
});

test("cross-tenant identity conflicts and operations are rejected", () => {
  const plan = buildControlledImportPlan([operation()], [{ garageId: garageB, source: "WORDPRESS", entity: "CUSTOMER", externalId: "42", fingerprint: fingerprintA }]);
  assert.equal(plan[0].outcome, "CONFLICT");
  assert.throws(() => preflightControlledImport(garageA, [{ ...plan[0], garageId: garageB }]));
});

test("dependency order requires reset before customers", () => {
  assert.doesNotThrow(() => assertControlledImportOrder(CONTROLLED_IMPORT_PHASES));
  assert.throws(() => assertControlledImportOrder(["CUSTOMERS", "RESET_COMMIT"]));
});

test("commit stays disabled without opt-in, confirmation and reset proof", async () => {
  const previous = process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT;
  process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT = "true";
  const repository: ControlledImportRepository = { async runInTransaction() { return ["CREATED"]; } };
  const plan = buildControlledImportPlan([operation()], []);
  await assert.rejects(() => executeControlledImport({ garageId: garageA, plan, repository, confirmation: `IMPORT:${garageA}`, resetCompletedBeforeCustomerImport: false }));
  if (previous === undefined) delete process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT; else process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT = previous;
});

test("repository transaction failure produces no partial success report", async () => {
  const previous = process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT;
  process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT = "true";
  const repository: ControlledImportRepository = { async runInTransaction() { throw new Error("transaction rolled back"); } };
  await assert.rejects(() => executeControlledImport({ garageId: garageA, plan: buildControlledImportPlan([operation()], []), repository, confirmation: `IMPORT:${garageA}`, resetCompletedBeforeCustomerImport: true }), /rolled back/);
  if (previous === undefined) delete process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT; else process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT = previous;
});

test("historical payments and media references are isolated from live lifecycle", () => {
  const sql = readFileSync("supabase/migrations/20260817000049_prepare_controlled_legacy_import.sql", "utf8");
  assert.match(sql, /create table public\.historical_payments/);
  assert.match(sql, /historical boolean not null default true check \(historical = true\)/);
  assert.doesNotMatch(sql, /insert into public\.payments|apply_verified_payment|hosted_payment_url/);
  assert.match(sql, /status text not null default 'PENDING' check \(status = 'PENDING'\)/);
  assert.match(sql, /legacy media tenant mismatch/);
});
