import { assertResetResourceAllowed } from "./reset-executor";
import type { ControlledResetGateway, StorageInventory } from "./reset-executor";

type StorageListItem = Readonly<{ id?: string | null; name: string; metadata?: Readonly<{ size?: number }> | null }>;

export class SupabaseControlledResetGateway implements ControlledResetGateway {
  constructor(private readonly url: string, private readonly serviceRoleKey: string, private readonly request: typeof fetch = fetch) {
    if (!/^https:\/\//.test(url) || !serviceRoleKey) throw new Error("RESET_ADMIN_CONFIG_INVALID");
  }

  static fromEnvironment(request: typeof fetch = fetch): SupabaseControlledResetGateway {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("RESET_ADMIN_CONFIG_MISSING");
    return new SupabaseControlledResetGateway(url, key, request);
  }

  private headers(extra: Readonly<Record<string, string>> = {}): HeadersInit {
    return { apikey: this.serviceRoleKey, Authorization: `Bearer ${this.serviceRoleKey}`, ...extra };
  }

  private async vehicleIds(garageId: string): Promise<readonly string[]> {
    const response = await this.request(`${this.url}/rest/v1/vehicles?select=id&garage_id=eq.${encodeURIComponent(garageId)}`, { headers: this.headers() });
    if (!response.ok) throw new Error(`RESET_VEHICLE_SCOPE_READ_FAILED:${response.status}`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error("RESET_VEHICLE_SCOPE_INVALID");
    return rows.flatMap((row) => typeof row === "object" && row !== null && typeof (row as { id?: unknown }).id === "string" ? [(row as { id: string }).id] : []);
  }

  private async filter(table: string, garageId: string, scope: "DIRECT" | "INDIRECT"): Promise<string> {
    if (scope === "DIRECT") return `garage_id=eq.${encodeURIComponent(garageId)}`;
    const ids = await this.vehicleIds(garageId);
    return ids.length ? `vehicle_id=in.(${ids.map(encodeURIComponent).join(",")})` : "vehicle_id=in.()";
  }

  async countTable(table: string, garageId: string, scope: "DIRECT" | "INDIRECT"): Promise<number> {
    const filter = await this.filter(table, garageId, scope);
    const response = await this.request(`${this.url}/rest/v1/${encodeURIComponent(table)}?select=id&${filter}`, {
      method: "HEAD", headers: this.headers({ Prefer: "count=exact" }),
    });
    if (!response.ok) throw new Error(`RESET_TABLE_COUNT_FAILED:${table}:${response.status}`);
    const total = response.headers.get("content-range")?.split("/")[1];
    return total && total !== "*" ? Number(total) : 0;
  }

  async deleteTable(table: string, garageId: string, scope: "DIRECT" | "INDIRECT"): Promise<number> {
    const filter = await this.filter(table, garageId, scope);
    if (filter.endsWith("in.()")) return 0;
    const response = await this.request(`${this.url}/rest/v1/${encodeURIComponent(table)}?${filter}`, {
      method: "DELETE", headers: this.headers({ Prefer: "return=representation" }),
    });
    if (!response.ok) throw new Error(`RESET_TABLE_DELETE_FAILED:${table}:${response.status}`);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error(`RESET_TABLE_DELETE_RESPONSE_INVALID:${table}`);
    return rows.length;
  }

  async inventoryStorage(bucket: string, prefix: string): Promise<StorageInventory> {
    const paths: string[] = [];
    let bytes = 0;
    const visit = async (folder: string): Promise<void> => {
      let offset = 0;
      while (true) {
        const response = await this.request(`${this.url}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
          method: "POST", headers: this.headers({ "content-type": "application/json" }),
          body: JSON.stringify({ prefix: folder.replace(/\/$/, ""), limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
        });
        if (!response.ok) throw new Error(`RESET_STORAGE_LIST_FAILED:${bucket}:${response.status}`);
        const items = await response.json() as StorageListItem[];
        for (const item of items) {
          const path = folder ? `${folder.replace(/\/$/, "")}/${item.name}` : item.name;
          if (item.id) { paths.push(path); bytes += Number(item.metadata?.size ?? 0); }
          else await visit(path);
        }
        if (items.length < 1000) break;
        offset += items.length;
      }
    };
    await visit(prefix);
    return { objects: paths.length, bytes, paths: paths.sort((left, right) => left.localeCompare(right, "en")) };
  }

  async deleteStorage(bucket: string, paths: readonly string[]): Promise<number> {
    if (!paths.length) return 0;
    const response = await this.request(`${this.url}/storage/v1/object/${encodeURIComponent(bucket)}`, {
      method: "DELETE", headers: this.headers({ "content-type": "application/json" }), body: JSON.stringify({ prefixes: paths }),
    });
    if (!response.ok) throw new Error(`RESET_STORAGE_DELETE_FAILED:${bucket}:${response.status}`);
    return paths.length;
  }

  async countLivePayments(garageId: string): Promise<number> {
    const response = await this.request(`${this.url}/rest/v1/payments?select=id&garage_id=eq.${encodeURIComponent(garageId)}&is_live=eq.true`, {
      method: "HEAD", headers: this.headers({ Prefer: "count=exact" }),
    });
    if (!response.ok) throw new Error(`RESET_LIVE_PAYMENT_COUNT_FAILED:${response.status}`);
    const total = response.headers.get("content-range")?.split("/")[1];
    return total && total !== "*" ? Number(total) : 0;
  }

  async executeAtomicDatabaseReset(garageId: string, items: readonly Readonly<{ table: string; scope: "DIRECT" | "INDIRECT"; expected: number }>[]): Promise<number> {
    for (const item of items) assertResetResourceAllowed(item.table, item.scope);
    const response=await this.request(`${this.url}/rest/v1/rpc/execute_controlled_tenant_reset`,{
      method:"POST",headers:this.headers({"content-type":"application/json"}),body:JSON.stringify({p_garage_id:garageId,p_tables:items,p_expected_total:items.reduce((sum,item)=>sum+item.expected,0)}),
    });
    if(!response.ok)throw new Error(`RESET_DATABASE_TRANSACTION_FAILED:${response.status}`);
    const value:unknown=await response.json();
    if(typeof value!=="number")throw new Error("RESET_DATABASE_TRANSACTION_RESPONSE_INVALID");
    return value;
  }
}
