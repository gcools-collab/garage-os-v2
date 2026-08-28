import { z } from "zod";
import { RESET_STORAGE_BUCKETS, RESET_TABLE_MANIFEST } from "./reset-manifest";
import type { ResetCount, TenantResetReport } from "./types";

const garageIdSchema = z.uuid();

export interface TenantResetInspector {
  countTable(table: string, garageId: string): Promise<number>;
  countStorage(bucket: string, prefix: string): Promise<number>;
  countLivePayments(garageId: string): Promise<number>;
}

export function requireGarageId(value: unknown): string {
  return garageIdSchema.parse(value);
}

export async function buildTenantResetDryRun(inspector: TenantResetInspector, garageIdInput: unknown): Promise<TenantResetReport> {
  const garageId = requireGarageId(garageIdInput);
  const tables = RESET_TABLE_MANIFEST.filter((entry) => entry.disposition !== "KEEP");
  const database: ResetCount[] = [];
  for (const table of tables) database.push({ resource: table.name, count: await inspector.countTable(table.name, garageId) });
  const storage: ResetCount[] = [];
  for (const bucket of RESET_STORAGE_BUCKETS) storage.push({ resource: bucket.name, count: await inspector.countStorage(bucket.name, bucket.prefix(garageId)) });
  const livePayments = await inspector.countLivePayments(garageId);
  const protectedData = tables
    .filter((table) => table.disposition === "REVIEW")
    .flatMap((table) => {
      const count = database.find((item) => item.resource === table.name)?.count ?? 0;
      return count > 0 ? [`${count} ligne(s) protégée(s) dans ${table.name} : validation humaine obligatoire.`] : [];
    });
  return {
    garageId, mode: "DRY_RUN", database, storage,
    blockers: [...protectedData, ...(livePayments > 0 ? [`${livePayments} paiement(s) live détecté(s) : exécution automatique interdite.`] : [])],
  };
}

export function assertResetExecutionAllowed(report: TenantResetReport, confirmation: string | undefined): void {
  if (process.env.NODE_ENV === "production") throw new Error("Tenant reset is disabled in production.");
  if (process.env.GARAGE_OS_ENABLE_TENANT_RESET !== "true") throw new Error("Tenant reset execution is disabled.");
  if (confirmation !== `RESET:${report.garageId}`) throw new Error("Explicit tenant reset confirmation is missing.");
  if (report.blockers.length > 0) throw new Error("Tenant reset is blocked by protected data.");
}
