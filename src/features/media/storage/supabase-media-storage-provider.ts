import type {
  MediaStorageObject,
  MediaStorageProvider,
  MediaUploadInput,
  MediaUploadResult,
} from "./media-storage-provider"

interface StorageError { readonly message: string }
interface StorageBucket {
  upload(path: string, body: MediaUploadInput["body"], options: { contentType?: string; upsert?: boolean }): Promise<{ data: { path: string } | null; error: StorageError | null }>
  remove(paths: string[]): Promise<{ error: StorageError | null }>
  move(fromPath: string, toPath: string): Promise<{ error: StorageError | null }>
  copy(fromPath: string, toPath: string): Promise<{ error: StorageError | null }>
  getPublicUrl(path: string): { data: { publicUrl: string } }
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: StorageError | null }>
  list(path: string): Promise<{ data: Array<{ name: string; updated_at?: string; metadata?: { size?: number } }> | null; error: StorageError | null }>
}
export interface SupabaseStorageClient {
  readonly storage: { from(bucket: string): StorageBucket }
}

function assertSuccess(error: StorageError | null, operation: string) {
  if (error) throw new Error(`${operation}: ${error.message}`)
}

export class SupabaseMediaStorageProvider implements MediaStorageProvider {
  constructor(private readonly client: SupabaseStorageClient) {}

  async upload(input: MediaUploadInput): Promise<MediaUploadResult> {
    const { data, error } = await this.client.storage.from(input.bucket).upload(
      input.path,
      input.body,
      { contentType: input.contentType, upsert: input.upsert }
    )
    assertSuccess(error, "Media upload failed")
    return { bucket: input.bucket, path: data?.path ?? input.path }
  }

  async delete(bucket: string, paths: readonly string[]) {
    if (!paths.length) return
    const { error } = await this.client.storage.from(bucket).remove([...paths])
    assertSuccess(error, "Media delete failed")
  }

  async move(bucket: string, fromPath: string, toPath: string) {
    const { error } = await this.client.storage.from(bucket).move(fromPath, toPath)
    assertSuccess(error, "Media move failed")
  }

  async copy(bucket: string, fromPath: string, toPath: string) {
    const { error } = await this.client.storage.from(bucket).copy(fromPath, toPath)
    assertSuccess(error, "Media copy failed")
  }

  getPublicUrl(bucket: string, path: string) {
    return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds: number) {
    const { data, error } = await this.client.storage.from(bucket)
      .createSignedUrl(path, expiresInSeconds)
    assertSuccess(error, "Media signed URL failed")
    if (!data?.signedUrl) throw new Error("Media signed URL is missing")
    return data.signedUrl
  }

  async list(bucket: string, path: string): Promise<readonly MediaStorageObject[]> {
    const { data, error } = await this.client.storage.from(bucket).list(path)
    assertSuccess(error, "Media list failed")
    return (data ?? []).map((item) => ({
      name: item.name,
      path: path ? `${path.replace(/\/$/, "")}/${item.name}` : item.name,
      size: item.metadata?.size ?? null,
      updatedAt: item.updated_at ?? null,
    }))
  }
}
