import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const garageId = "363f2dc0-bfd3-48d6-a1cc-96e113e96094";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" };

async function countTable(table: string, filter = `garage_id=eq.${garageId}`): Promise<number> {
  const response = await fetch(`${url}/rest/v1/${table}?select=id&${filter}`, { method: "HEAD", headers });
  if (!response.ok) throw new Error(`COUNT_FAILED:${table}:${response.status}`);
  const total = response.headers.get("content-range")?.split("/")[1];
  return total && total !== "*" ? Number(total) : 0;
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "baseline";
  const vehicleIds = await client.from("vehicles").select("id").eq("garage_id", garageId);
  const ids = (vehicleIds.data ?? []).map((row) => row.id);
  const vehicleImagesCount = ids.length
    ? await countTable("vehicle_images", `vehicle_id=in.(${ids.map(encodeURIComponent).join(",")})`)
    : 0;

  const { data: primaries } = await client
    .from("vehicle_images")
    .select("vehicle_id, id, storage_path, is_primary, display_order")
    .in("vehicle_id", ids)
    .eq("is_primary", true);

  const billingCount = mode === "schema" ? await countTable("billing_documents").catch(() => -1) : undefined;
  const fiscalCount = mode === "schema" ? await countTable("garage_fiscal_settings").catch(() => -1) : undefined;
  const eInvCount = mode === "schema" ? await countTable("garage_electronic_invoice_settings").catch(() => -1) : undefined;

  process.stdout.write(`${JSON.stringify({
    mode,
    vehicleImages: vehicleImagesCount,
    primaryImages: (primaries ?? []).map((row) => ({
      vehicle_id: row.vehicle_id,
      id: row.id,
      storage_path: row.storage_path,
      display_order: (row as { display_order?: number }).display_order ?? null,
    })),
    billingDocuments: billingCount,
    fiscalSettingsRows: fiscalCount,
    electronicInvoiceSettingsRows: eInvCount,
  }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "PROBE_FAILED"}\n`);
  process.exitCode = 1;
});
