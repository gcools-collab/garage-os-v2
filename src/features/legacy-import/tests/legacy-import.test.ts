import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildLegacyImportPreview, buildLegacyMediaReconciliation, classifyElementorLead, classifyHistoricalPayment, classifyLegacyBooking,
  discoverLegacySql, formatLegacyImportPreview, indexPhysicalMedia, isWordPressGeneratedVariant,
  normalizeLegacyCustomer, parseLegacyMileage, parseLegacyPower, parseLegacyPrice,
  parseLegacyRegistrationDate, parseWordPressWxr, resolveLegacyCustomer, serializeLegacyMediaManifest,
} from "..";
import type { LegacyLead, LegacyPayment } from "..";

const garageA = "363f2dc0-bfd3-48d6-a1cc-96e113e96094";
const garageB = "e8dc75f8-4362-4a0a-9357-e20633fa3263";

const item = (id: string, title: string, status: string, fields: Readonly<Record<string, string>>): string => `
<item><title><![CDATA[${title}]]></title><link>https://legacy.invalid/${id}</link>
<content:encoded><![CDATA[<strong>Très beau véhicule</strong><br>Garantie.]]></content:encoded>
<wp:post_id>${id}</wp:post_id><wp:post_type>vehicules</wp:post_type><wp:status>${status}</wp:status>
<wp:post_name>vehicle-${id}</wp:post_name><wp:post_date_gmt>2020-01-01 10:00:00</wp:post_date_gmt>
${Object.entries(fields).map(([key, value]) => `<wp:postmeta><wp:meta_key><![CDATA[${key}]]></wp:meta_key><wp:meta_value><![CDATA[${value}]]></wp:meta_value></wp:postmeta>`).join("")}
</item>`;
const attachment = (id: string): string => `<item><wp:post_id>${id}</wp:post_id><wp:post_type>attachment</wp:post_type><wp:attachment_url>https://legacy.invalid/uploads/${id}.jpg</wp:attachment_url><wp:postmeta><wp:meta_key>_wp_attached_file</wp:meta_key><wp:meta_value>2020/01/${id}.jpg</wp:meta_value></wp:postmeta></item>`;

test("normalise prix TTC, HT/TTC, kilométrage, dates et puissance sans invention", () => {
  assert.deepEqual(parseLegacyPrice("15 990€ TTC"), { grossCents: 1_599_000, netCents: null, vatMentioned: true });
  assert.deepEqual(parseLegacyPrice("10 408,33€ HT <br> 12 490€ TTC"), { grossCents: 1_249_000, netCents: 1_040_833, vatMentioned: true });
  assert.equal(parseLegacyMileage("161 000kms"), 161000);
  assert.equal(parseLegacyMileage("183 000 Ã  192 000kms"), null);
  assert.equal(parseLegacyMileage("183 000 à 192 000kms"), null);
  assert.deepEqual(parseLegacyRegistrationDate("29/10/2020"), { value: "2020-10-29", precision: "DAY" });
  assert.deepEqual(parseLegacyRegistrationDate("02/2021"), { value: "2021-02", precision: "MONTH" });
  assert.deepEqual(parseLegacyPower("8cv fiscaux / 136cv DIN"), { fiscalHp: 8, dinHp: 136 });
});

test("parse les véhicules WXR publiés, trash, vendus, réservés et médias pending", () => {
  const xml = `<rss><channel>${attachment("20")}${item("10", "Peugeot 208", "publish", { "veh-prix": "15 990€ TTC", "veh-kilometrage": "161 000kms", "veh-premiere-mec": "02/2021", "veh-puissance": "8cv fiscaux / 136cv DIN", "veh-gallerie_photos": "21,22", "_thumbnail_id": "20" })}${item("11", "Renault Clio vendue", "publish", { "veh-vendu": "oui" })}${item("12", "BMW réservée", "draft", {})}${item("13", "Ancienne", "trash", {})}</channel></rss>`;
  const vehicles = parseWordPressWxr(xml, garageA);
  assert.equal(vehicles.length, 4);
  assert.equal(vehicles[0].decision, "IMPORT");
  assert.equal(vehicles[0].media.length, 3);
  assert.equal(vehicles[0].media[0].status, "PENDING");
  assert.equal(vehicles[0].media[0].relativePath, "2020/01/20.jpg");
  assert.equal(vehicles[0].plainText, "Très beau véhicule\nGarantie.");
  assert.equal(vehicles[1].lifecycle, "SOLD");
  assert.equal(vehicles[2].lifecycle, "RESERVED");
  assert.equal(vehicles[3].decision, "IGNORE");
});

test("le WXR 6054 conserve une plage ambiguë comme kilométrage inconnu", () => {
  const [vehicle] = parseWordPressWxr(`<rss><channel>${item("6054", "Citroen Jumpy taille M", "publish", { "veh-kilometrage": "183 000 à 192 000kms" })}</channel></rss>`, garageA);
  assert.equal(vehicle.externalId, "6054");
  assert.equal(vehicle.fields["veh-kilometrage"], "183 000 à 192 000kms");
  assert.equal(vehicle.mileageKm, null);
});

test("une galerie ACF sérialisée ne transforme pas index et longueurs en attachments", () => {
  const serialized = 'a:2:{i:0;s:2:"21";i:1;s:2:"22";}';
  const [vehicle] = parseWordPressWxr(`<rss>${item("10", "Peugeot", "publish", { "veh-gallerie_photos": serialized })}</rss>`, garageA);
  assert.deepEqual(vehicle.media.map((media) => media.attachmentId), ["21", "22"]);
});

test("découvre seulement les domaines SQL métier et ignore les tables techniques", () => {
  const discovery = discoverLegacySql("CREATE TABLE `wp_users` (); CREATE TABLE wp_yith_booking (); CREATE TABLE wp_actionscheduler_logs (); INSERT INTO wp_e_submissions VALUES (1); INSERT INTO wp_wc_orders VALUES (1);");
  assert.deepEqual(discovery.customerSources, ["wp_users", "wp_wc_orders"]);
  assert.deepEqual(discovery.bookingSources, ["wp_yith_booking"]);
  assert.deepEqual(discovery.leadSources, ["wp_e_submissions"]);
  assert.equal(discovery.ignoredTechnicalTables, 1);
});

test("importe uniquement les bookings payés et aboutis", () => {
  assert.equal(classifyLegacyBooking("1", "confirmed", true).decision, "IMPORT");
  assert.equal(classifyLegacyBooking("2", "unpaid", false).decision, "IGNORE");
  assert.equal(classifyLegacyBooking("3", "cancelled", true).decision, "IGNORE");
});

test("classe paiements historiques et formulaires sans toucher au lifecycle natif", () => {
  assert.equal(classifyHistoricalPayment({ externalId: "o1", externalPaymentId: "p1", provider: "PAYPLUG_LEGACY", amountCents: 5000, status: "paid" }).decision, "IMPORT");
  assert.equal(classifyHistoricalPayment({ externalId: "o2", externalPaymentId: null, provider: null, amountCents: null, status: "unknown" }).decision, "REVIEW");
  assert.equal(classifyElementorLead("f1", "Formulaire renseignement service").decision, "IMPORT");
  assert.equal(classifyElementorLead("f2", "Formulaire inconnu").decision, "REVIEW");
});

test("résout les clients sans jamais fusionner sur le nom seul et respecte le tenant", () => {
  const candidate = normalizeLegacyCustomer({ garageId: garageA, source: "WOOCOMMERCE", externalId: "42", firstName: "Marie", lastName: "Martin", email: " MARIE@EXAMPLE.FR ", phone: "06 12 34 56 78", city: "Raismes" });
  const exact = { id: "customer-a", garageId: garageA, firstName: "Marie", lastName: "Martin", normalizedEmail: "marie@example.fr", normalizedPhone: "+33612345678" };
  assert.equal(resolveLegacyCustomer(candidate, [exact]).decision, "MATCH");
  assert.equal(resolveLegacyCustomer({ ...candidate, firstName: "Jeanne" }, [exact]).decision, "REVIEW");
  assert.equal(resolveLegacyCustomer({ ...candidate, email: null, normalizedEmail: null }, [{ ...exact, firstName: "Autre" }]).decision, "REVIEW");
  assert.equal(resolveLegacyCustomer(candidate, [{ ...exact, garageId: garageB }]).decision, "CREATE");
  const nameOnly = { ...candidate, email: null, phone: null, normalizedEmail: null, normalizedPhone: null };
  assert.equal(resolveLegacyCustomer(nameOnly, [exact]).decision, "CREATE");
});

test("le preview calcule les classifications et garantit zéro mutation", () => {
  const vehicles = parseWordPressWxr(`<rss>${item("10", "Peugeot", "publish", { "veh-gallerie_photos": "20,21" })}${item("11", "Trash", "trash", {})}</rss>`, garageA);
  const customer = normalizeLegacyCustomer({ garageId: garageA, source: "WORDPRESS", externalId: "u1", firstName: "Marie", lastName: "Martin", email: "marie@example.fr", phone: null, city: null });
  const payments: readonly LegacyPayment[] = [{ externalId: "o1", externalPaymentId: "p1", provider: "PAYPLUG_LEGACY", amountCents: 5000, status: "paid", historical: true, decision: "IMPORT" }];
  const leads: readonly LegacyLead[] = [{ externalId: "f1", formName: "formulaire renseignement", decision: "IMPORT" }, { externalId: "f2", formName: "inconnu", decision: "REVIEW" }];
  const report = buildLegacyImportPreview({ garageId: garageA, wxrParsed: true, sqlParsed: true, mediaArchivePresent: false, vehicles, customers: [customer], customerMatches: [{ decision: "CREATE", customerId: null, reasons: [] }], bookings: [classifyLegacyBooking("b1", "paid", true), classifyLegacyBooking("b2", "unpaid", false)], payments, leads, sqlDiscovery: discoverLegacySql("") });
  assert.equal(report.vehicles.importable, 1);
  assert.equal(report.appointments.ignored, 1);
  assert.equal(report.media.pendingPhysicalFiles, 2);
  assert.equal(report.databaseMutations, 0);
  assert.equal(report.storageMutations, 0);
  assert.match(formatLegacyImportPreview(report), /Database mutations: 0/);
});

test("la migration impose RLS, FKs tenant et aucune intégration payment legacy", () => {
  const migration = readFileSync("supabase/migrations/20260817000048_create_customer_foundation.sql", "utf8");
  assert.match(migration, /create table public\.customers/);
  assert.match(migration, /create table public\.customer_vehicles/);
  assert.match(migration, /foreign key \(customer_id, garage_id\)/g);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /garage_members/g);
  assert.doesNotMatch(migration, /alter table public\.payments/);
});

test("reconciles originals, ignores variants and handles duplicated year folders", () => {
  const root = mkdtempSync(join(tmpdir(), "garage-os-media-"));
  try {
    mkdirSync(join(root, "2024", "2024", "08"), { recursive: true });
    writeFileSync(join(root, "2024", "2024", "08", "original.jpg"), "original");
    writeFileSync(join(root, "2024", "2024", "08", "original-300x200.jpg"), "variant");
    const xml = `<rss>${attachment("20").replace("2020/01/20.jpg", "2024/08/original.jpg")}${item("10", "Peugeot", "publish", { "_thumbnail_id": "20" })}</rss>`;
    const vehicles = parseWordPressWxr(xml, garageA);
    const report = buildLegacyMediaReconciliation({ garageId: garageA, vehicles, files: indexPhysicalMedia(root) });
    assert.equal(report.entries[0].resolution, "DUPLICATED_YEAR");
    assert.equal(report.entries[0].status, "AUTO");
    assert.equal(report.counters.wordpressGeneratedVariantsIgnored, 1);
    assert.match(report.entries[0].target_storage_path ?? "", new RegExp(`^${garageA}/\\{vehicle_id\\}/legacy-10-`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("classifies missing and ambiguous attachments without inventing a primary", () => {
  const root = mkdtempSync(join(tmpdir(), "garage-os-media-"));
  try {
    mkdirSync(join(root, "a", "2024", "08"), { recursive: true });
    mkdirSync(join(root, "b", "2024", "08"), { recursive: true });
    writeFileSync(join(root, "a", "2024", "08", "shared.jpg"), "same");
    writeFileSync(join(root, "b", "2024", "08", "shared.jpg"), "same");
    const attachments = `${attachment("20").replace("2020/01/20.jpg", "2024/08/shared.jpg")}${attachment("21").replace("2020/01/21.jpg", "2024/08/missing.jpg")}`;
    const vehicles = parseWordPressWxr(`<rss>${attachments}${item("10", "Peugeot", "publish", { "_thumbnail_id": "20", "veh-gallerie_photos": "21" })}</rss>`, garageA);
    const report = buildLegacyMediaReconciliation({ garageId: garageA, vehicles, files: indexPhysicalMedia(root) });
    assert.deepEqual(report.entries.map((entry) => entry.status), ["REVIEW", "BLOCKER"]);
    assert.equal(report.coverage[0].primary, "REVIEW");
    assert.equal(report.coverage[0].status, "BLOCKER");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("detects duplicate hashes and serializes a portable deterministic manifest", () => {
  const root = mkdtempSync(join(tmpdir(), "garage-os-media-"));
  try {
    mkdirSync(join(root, "2020", "01"), { recursive: true });
    writeFileSync(join(root, "2020", "01", "20.jpg"), "duplicate");
    writeFileSync(join(root, "2020", "01", "21.jpg"), "duplicate");
    const vehicles = parseWordPressWxr(`<rss>${attachment("20")}${attachment("21")}${item("10", "Peugeot", "publish", { "_thumbnail_id": "20", "veh-gallerie_photos": "21" })}</rss>`, garageA);
    const report = buildLegacyMediaReconciliation({ garageId: garageA, vehicles, files: indexPhysicalMedia(root) });
    assert.equal(report.counters.duplicateSha256, 1);
    const serialized = serializeLegacyMediaManifest(report);
    assert.equal(serialized, serializeLegacyMediaManifest(report));
    assert.doesNotMatch(serialized, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(serialized, /WORDPRESS_UPLOADS_ROOT/);
    assert.equal(report.databaseMutations, 0);
    assert.equal(report.storageMutations, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("identifies WordPress generated variants explicitly", () => {
  assert.equal(isWordPressGeneratedVariant("2024/08/car-300x200.jpg"), true);
  assert.equal(isWordPressGeneratedVariant("2024/08/car-scaled.jpg"), true);
  assert.equal(isWordPressGeneratedVariant("2024/08/car.webp"), true);
  assert.equal(isWordPressGeneratedVariant("2024/08/car.jpg"), false);
});
