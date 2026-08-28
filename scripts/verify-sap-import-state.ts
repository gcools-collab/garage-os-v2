import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  loadApprovedMediaManifest,
  SAP_APPROVED_GARAGE_ID,
  SAP_APPROVED_IMPORT_COUNTS,
  SAP_APPROVED_MANIFEST_SHA256,
} from "../src/features/legacy-import";

loadEnvConfig(process.cwd());

const garageId = SAP_APPROVED_GARAGE_ID;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");

const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" };

async function countTable(table: string, filter = `garage_id=eq.${garageId}`): Promise<number> {
  const response = await fetch(`${url}/rest/v1/${table}?select=id&${filter}`, { method: "HEAD", headers });
  if (!response.ok) throw new Error(`COUNT_FAILED:${table}:${response.status}`);
  const total = response.headers.get("content-range")?.split("/")[1];
  return total && total !== "*" ? Number(total) : 0;
}

async function main(): Promise<void> {
  const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const checkpointRow = await client
    .from("legacy_import_checkpoints")
    .select("execution_id,checkpoint")
    .eq("garage_id", garageId);
  const checkpoint = (checkpointRow.data ?? []).find((row) => row.execution_id === "GO-0084B2-SAP-v1")?.checkpoint ?? null;
  const historicalRows = await client.from("historical_payments").select("amount_cents").eq("garage_id", garageId);
  const historicalTotalCents = (historicalRows.data ?? []).reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const liveResponse = await fetch(`${url}/rest/v1/payments?select=id&garage_id=eq.${garageId}&is_live=eq.true`, {
    method: "HEAD",
    headers,
  });
  const livePayments = Number(liveResponse.headers.get("content-range")?.split("/")[1] ?? 0);

  const bundlePath = resolve(".local/legacy/go-0084b2-execution-bundle.json");
  const manifestPath = resolve(".local/legacy/go-0084b1-final-media-manifest.json");
  const bundleHash = createHash("sha256").update(readFileSync(bundlePath)).digest("hex");
  const manifestHash = createHash("sha256").update(readFileSync(manifestPath)).digest("hex");
  const sourceRoot = resolve("C:/Users/AG-F4/Desktop/Extract new/wp-content/uploads");
  const manifest = loadApprovedMediaManifest(manifestPath, SAP_APPROVED_MANIFEST_SHA256);
  const hashBytes = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

  let missing = 0;
  let mismatch = 0;
  let verified = 0;
  const physical = new Set<string>();
  for (const entry of manifest.entries) {
    const relative = entry.source_relative_path!.split("\\").join("/");
    const sourcePath = resolve(sourceRoot, ...relative.split("/"));
    if (!existsSync(sourcePath)) {
      missing += 1;
      continue;
    }
    const bytes = readFileSync(sourcePath);
    if (bytes.byteLength !== entry.source_size || hashBytes(bytes) !== entry.sha256) mismatch += 1;
    else verified += 1;
    physical.add(`${entry.vehicle_legacy_external_id}|${entry.sha256}`);
  }

  const vehicleIds = await client.from("vehicles").select("id").eq("garage_id", garageId);
  const scopedVehicleIds = (vehicleIds.data ?? []).map((row) => row.id);
  const vehicleImagesCount = scopedVehicleIds.length
    ? await countTable("vehicle_images", `vehicle_id=in.(${scopedVehicleIds.map(encodeURIComponent).join(",")})`)
    : 0;

  process.stdout.write(`${JSON.stringify({
    checkpoint,
    counts: {
      customers: await countTable("customers"),
      vehicles: await countTable("vehicles"),
      appointments: await countTable("appointments"),
      historical_payments: await countTable("historical_payments"),
      historical_payment_total_cents: historicalTotalCents,
      leads: await countTable("leads"),
      legacy_import_records: await countTable("legacy_import_records"),
      legacy_media_references: await countTable("legacy_media_references"),
      vehicle_images: vehicleImagesCount,
      payments: await countTable("payments"),
      live_payments: livePayments,
    },
    hashes: {
      bundle: bundleHash,
      bundleApproved: "3aa8072b9567a099cb77801060d37353574186707bd1daa37b2f3b6700ca92c7",
      manifest: manifestHash,
      manifestApproved: SAP_APPROVED_MANIFEST_SHA256,
    },
    sourceVerification: {
      verified,
      missing,
      hashOrSizeMismatch: mismatch,
      physical: physical.size,
      relations: manifest.entries.length,
    },
    approved: SAP_APPROVED_IMPORT_COUNTS,
  }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "VERIFY_FAILED"}\n`);
  process.exitCode = 1;
});
