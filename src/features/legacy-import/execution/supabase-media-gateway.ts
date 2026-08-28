import type { ImportOutcome } from "@/features/data-readiness";
import type { MediaManifestEntry, MediaRelationGateway, MediaStorageGateway } from "./types";
import type { LegacyImportSupabaseClient } from "./supabase-controlled-import-repository";

type StorageListItem = Readonly<{ id?: string | null; name: string; metadata?: Readonly<{ size?: number; sha256?: string }> | null }>;

export class SupabaseMediaStorageGateway implements MediaStorageGateway {
  constructor(private readonly url: string, private readonly key: string, private readonly request: typeof fetch = fetch) {}

  private headers(extra: Readonly<Record<string, string>> = {}): HeadersInit {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, ...extra };
  }

  private encodedObjectPath(path: string): string {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  async inspect(bucket: string, path: string) {
    const segments = path.split("/");
    const fileName = segments.pop();
    if (!fileName) throw new Error("MEDIA_STORAGE_INSPECT_PATH_INVALID");
    const prefix = segments.join("/");
    const response = await this.request(`${this.url}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`MEDIA_STORAGE_INSPECT_FAILED:${response.status}:${detail.slice(0, 200)}`);
    }
    const items = (await response.json()) as StorageListItem[];
    const match = items.find((item) => item.id && item.name === fileName);
    if (!match) return { exists: false, size: null, sha256: null };
    return {
      exists: true,
      size: Number(match.metadata?.size ?? 0),
      sha256: match.metadata?.sha256 ?? null,
    };
  }

  async upload(bucket: string, path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    const response = await this.request(`${this.url}/storage/v1/object/${encodeURIComponent(bucket)}/${this.encodedObjectPath(path)}`, {
      method: "POST",
      headers: this.headers({ "content-type": contentType, "x-upsert": "false" }),
      body: Buffer.from(bytes),
    });
    if (!response.ok) throw new Error(`MEDIA_STORAGE_UPLOAD_FAILED:${response.status}`);
  }

  async deleteOwned(bucket: string, path: string): Promise<void> {
    const response = await this.request(`${this.url}/storage/v1/object/${encodeURIComponent(bucket)}`, {
      method: "DELETE", headers: this.headers({ "content-type": "application/json" }), body: JSON.stringify({ prefixes: [path] }),
    });
    if (!response.ok) throw new Error(`MEDIA_STORAGE_CLEANUP_FAILED:${response.status}`);
  }
}

export class SupabaseMediaRelationGateway implements MediaRelationGateway {
  constructor(private readonly client: LegacyImportSupabaseClient) {}

  async resolveVehicleId(garageId: string, legacyVehicleId: string): Promise<string | null> {
    const { data, error } = await this.client.rpc("resolve_legacy_vehicle_id", { p_garage_id: garageId, p_external_id: legacyVehicleId });
    if (error) throw new Error(`MEDIA_VEHICLE_RESOLUTION_FAILED:${error.code ?? "UNKNOWN"}`);
    return typeof data === "string" ? data : null;
  }

  async persist(entry: MediaManifestEntry, vehicleId: string, storagePath: string, createVehicleImage: boolean): Promise<ImportOutcome> {
    const { data, error } = await this.client.rpc("persist_legacy_media_relation", {
      p_garage_id: entry.garage_id, p_vehicle_id: vehicleId,
      p_legacy_vehicle_external_id: entry.vehicle_legacy_external_id, p_external_attachment_id: entry.attachment_id,
      p_legacy_url: null, p_relative_path: entry.source_relative_path, p_position: entry.gallery_position,
      p_role: entry.is_primary ? "COVER" : "GALLERY", p_storage_path: storagePath,
      p_create_vehicle_image: createVehicleImage, p_sha256: entry.sha256,
    });
    if (error) throw new Error(`MEDIA_RELATION_PERSIST_FAILED:${error.code ?? "UNKNOWN"}`);
    if (data === "CREATED" || data === "SKIPPED" || data === "CONFLICT" || data === "FAILED" || data === "UPDATED") return data;
    throw new Error("MEDIA_RELATION_RESPONSE_INVALID");
  }
}
