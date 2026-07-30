export interface MediaStorageObject {
  readonly name: string
  readonly path: string
  readonly size: number | null
  readonly updatedAt: string | null
}

export interface MediaUploadInput {
  readonly bucket: string
  readonly path: string
  readonly body: Blob | ArrayBuffer | Uint8Array
  readonly contentType?: string
  readonly upsert?: boolean
}

export interface MediaUploadResult {
  readonly bucket: string
  readonly path: string
}

export interface MediaStorageProvider {
  upload(input: MediaUploadInput): Promise<MediaUploadResult>
  delete(bucket: string, paths: readonly string[]): Promise<void>
  move(bucket: string, fromPath: string, toPath: string): Promise<void>
  copy(bucket: string, fromPath: string, toPath: string): Promise<void>
  getPublicUrl(bucket: string, path: string): string
  getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>
  list(bucket: string, path: string): Promise<readonly MediaStorageObject[]>
}
