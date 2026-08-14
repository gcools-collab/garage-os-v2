import assert from "node:assert/strict";
import test from "node:test";
import { buildTenantResetDryRun, classifyImportCandidate, createImportCandidate, requireGarageId, RESET_TABLE_MANIFEST } from "..";

const garageA = "363f2dc0-bfd3-48d6-a1cc-96e113e96094";
const garageB = "e8dc75f8-4362-4a0a-9357-e20633fa3263";

test("a reset cannot be planned without a valid garage id", () => {
  assert.throws(() => requireGarageId(undefined));
  assert.throws(() => requireGarageId("all"));
});

test("the reset manifest preserves tenant identity, memberships and configuration", () => {
  const kept = new Set(RESET_TABLE_MANIFEST.filter((item) => item.disposition === "KEEP").map((item) => item.name));
  for (const table of ["garages", "profiles", "garage_members", "garage_branding", "garage_services", "garage_scheduling_settings", "service_offers"]) {
    assert.ok(kept.has(table), `${table} must be preserved`);
  }
});

test("the reset manifest has an explicit FK-safe order", () => {
  const reset = RESET_TABLE_MANIFEST.filter((item) => item.deleteOrder !== null);
  assert.equal(new Set(reset.map((item) => item.deleteOrder)).size, reset.length);
  const order = (name: string) => reset.find((item) => item.name === name)?.deleteOrder ?? 0;
  assert.ok(order("vehicle_documents") < order("vehicles"));
  assert.ok(order("acquisition_documents") < order("acquisition_sellers"));
  assert.ok(order("payment_events") < order("payments"));
});

test("dry-run is tenant scoped and reports protected live payments", async () => {
  const observedGarageIds = new Set<string>();
  const report = await buildTenantResetDryRun({
    async countTable(_table, garageId) { observedGarageIds.add(garageId); return 2; },
    async countStorage(_bucket, prefix) { assert.equal(prefix, `${garageA}/`); return 1; },
    async countLivePayments(garageId) { observedGarageIds.add(garageId); return 1; },
  }, garageA);
  assert.deepEqual([...observedGarageIds], [garageA]);
  assert.equal(report.mode, "DRY_RUN");
  assert.equal(report.blockers.length, 1);
});

test("WordPress import is idempotent, update-aware and tenant safe", () => {
  const original = createImportCandidate({ garageId: garageA, source: "WORDPRESS", externalId: "vehicle-42" }, { title: "Peugeot 208" });
  assert.equal(classifyImportCandidate(original, []), "CREATED");
  assert.equal(classifyImportCandidate(original, [original]), "SKIPPED");
  const changed = createImportCandidate({ garageId: garageA, source: "WORDPRESS", externalId: "vehicle-42" }, { title: "Peugeot 208 GT" });
  assert.equal(classifyImportCandidate(changed, [original]), "UPDATED");
  const otherTenant = createImportCandidate({ garageId: garageB, source: "WORDPRESS", externalId: "vehicle-42" }, { title: "Peugeot 208" });
  assert.equal(classifyImportCandidate(otherTenant, [original]), "CONFLICT");
});

test("unknown import sources are rejected", () => {
  assert.throws(() => createImportCandidate({ garageId: garageA, source: "CSV" as "WORDPRESS", externalId: "1" }, {}));
});

