import assert from "node:assert/strict"
import test from "node:test"
import {
  ASSET_PROCESSING_TRANSITIONS,
  ASSET_PROCESSING_OPERATIONS,
  ASSET_TYPES,
  ASSET_TYPE_PRESENTATION,
  SupabaseMediaStorageProvider,
  VehicleAssetGalleryBuilder,
  buildAssetGalleryViewModel,
  buildAssetImageViewModel,
  buildAssetSeoViewModel,
  canTransitionAssetStatus,
  createPendingProcessing,
  mapVehicleDocumentAsset,
  mapVehicleImageAsset,
  resolveAssetVariant,
  sortAssets,
  type Asset,
  type SupabaseStorageClient,
} from ".."

function asset(id: string, overrides: Partial<Asset> = {}): Asset {
  return {
    id,
    garageId: "garage-1",
    vehicleId: "vehicle-1",
    type: "IMAGE",
    status: "READY",
    visibility: "PUBLIC",
    storageBucket: "vehicle-images",
    storagePath: `garage-1/vehicle-1/${id}.jpg`,
    sourceUrl: `https://media.example/${id}.jpg`,
    variants: [{
      id: `${id}:original`,
      name: "original",
      storagePath: `garage-1/vehicle-1/${id}.jpg`,
      url: `https://media.example/${id}.jpg`,
      width: 1600,
      height: 1200,
    }],
    metadata: {
      width: 1600,
      height: 1200,
      alt: `Véhicule ${id}`,
      createdAt: "2026-07-30T10:00:00.000Z",
    },
    processing: {
      status: "READY",
      progress: 100,
      operation: null,
      errorCode: null,
      errorMessage: null,
      startedAt: null,
      completedAt: "2026-07-30T10:00:00.000Z",
    },
    position: null,
    manualOrder: null,
    isCover: false,
    isFeatured: false,
    collectionIds: [],
    ...overrides,
  }
}

test("le registre couvre tous les AssetType sans switch React", () => {
  assert.equal(ASSET_TYPES.length, 10)
  assert.deepEqual(Object.keys(ASSET_TYPE_PRESENTATION).sort(), [...ASSET_TYPES].sort())
  assert.equal(ASSET_TYPE_PRESENTATION.THREE_SIXTY_SEQUENCE.renderKind, "INTERACTIVE")
})

test("résout les variantes selon la cible et conserve le fallback original", () => {
  const source = asset("a", {
    variants: [
      { id: "a:original", name: "original", storagePath: "a.jpg", url: "https://media/a.jpg" },
      { id: "a:mobile", name: "mobile", storagePath: "a-mobile.webp", url: "https://media/a-mobile.webp" },
      { id: "a:thumb", name: "thumbnail", storagePath: "a-thumb.webp", url: "https://media/a-thumb.webp" },
    ],
  })
  assert.equal(resolveAssetVariant(source, "mobile")?.name, "mobile")
  assert.equal(resolveAssetVariant(source, "thumbnail")?.name, "thumbnail")
  assert.equal(resolveAssetVariant(source, "desktop")?.name, "original")
})

test("l’ordre manuel précède position puis date et identifiant", () => {
  const ordered = sortAssets([
    asset("c", { position: 1 }),
    asset("b", { manualOrder: 2 }),
    asset("a", { manualOrder: 1 }),
  ])
  assert.deepEqual(ordered.map((item) => item.id), ["a", "b", "c"])
})

test("le gallery builder garantit cover, galerie et featured", () => {
  const gallery = new VehicleAssetGalleryBuilder().build({
    vehicleId: "vehicle-1",
    assets: [
      asset("second", { manualOrder: 2, isFeatured: true }),
      asset("cover", { manualOrder: 1, isCover: true }),
      asset("archived", { status: "ARCHIVED", isCover: true }),
      asset("foreign", { vehicleId: "vehicle-2" }),
    ],
  })
  assert.equal(gallery.cover.id, "cover")
  assert.deepEqual(gallery.orderedAssets.map((item) => item.id), ["cover", "second"])
  assert.deepEqual(gallery.featured.map((item) => item.id), ["second"])
})

test("une cover fallback garantit une galerie même sans asset véhicule", () => {
  const fallback = asset("fallback", { vehicleId: null })
  const gallery = new VehicleAssetGalleryBuilder().build({
    vehicleId: "vehicle-1",
    assets: [],
    fallbackCover: fallback,
  })
  assert.equal(gallery.cover.id, "fallback")
  assert.deepEqual(gallery.gallery, [])
})

test("le builder refuse explicitement une galerie sans cover possible", () => {
  assert.throws(
    () => new VehicleAssetGalleryBuilder().build({ vehicleId: "vehicle-1", assets: [] }),
    /requires a cover asset/
  )
})

test("les états de processing et transitions restent déterministes", () => {
  assert.equal(ASSET_PROCESSING_OPERATIONS.includes("AI_ENHANCEMENT"), true)
  assert.equal(canTransitionAssetStatus("UPLOADING", "PROCESSING"), true)
  assert.equal(canTransitionAssetStatus("READY", "UPLOADING"), false)
  assert.deepEqual(ASSET_PROCESSING_TRANSITIONS.ARCHIVED, [])
  assert.deepEqual(createPendingProcessing("THUMBNAIL_GENERATION", new Date("2026-07-30T12:00:00Z")), {
    status: "PROCESSING",
    progress: 0,
    operation: "THUMBNAIL_GENERATION",
    errorCode: null,
    errorMessage: null,
    startedAt: "2026-07-30T12:00:00.000Z",
    completedAt: null,
  })
})

test("les builders préparent les ViewModels et le SEO sans Asset brut", () => {
  const cover = asset("cover", {
    isCover: true,
    metadata: {
      alt: "BMW M3 noire",
      caption: "Vue trois quarts avant",
      dominantColor: "#111111",
      blurHash: "hash",
    },
  })
  const gallery = new VehicleAssetGalleryBuilder().build({
    vehicleId: "vehicle-1",
    assets: [cover],
  })
  const view = buildAssetGalleryViewModel(gallery)
  assert.equal(view.empty, false)
  if (view.empty) return
  assert.equal(view.cover.alt, "BMW M3 noire")
  assert.equal("storagePath" in view.cover, false)
  const seo = buildAssetSeoViewModel(cover)
  assert.equal(seo?.structuredImage["@type"], "ImageObject")
  assert.equal(seo?.openGraphImage, "https://media.example/cover.jpg")
})

test("un asset sans URL produit un placeholder de présentation", () => {
  const fallback = asset("empty", {
    sourceUrl: null,
    storagePath: null,
    variants: [],
    isCover: true,
  })
  assert.equal(buildAssetImageViewModel(fallback, "desktop"), null)
  const gallery = new VehicleAssetGalleryBuilder().build({
    vehicleId: "vehicle-1",
    assets: [fallback],
  })
  assert.equal(buildAssetGalleryViewModel(gallery).empty, true)
})

test("les adapters unifient images publiques et documents signés", () => {
  const image = mapVehicleImageAsset({
    id: "image-1", garageId: "garage-1", vehicleId: "vehicle-1",
    storagePath: "garage-1/vehicle-1/image.jpg",
    publicUrl: "https://media/image.jpg",
    createdAt: "2026-07-30T10:00:00Z", isPrimary: true,
  })
  const document = mapVehicleDocumentAsset({
    id: "document-1", garageId: "garage-1", vehicleId: "vehicle-1",
    storagePath: "garage-1/vehicle-1/file.pdf", mimeType: "application/pdf",
    sizeBytes: 2048, originalFilename: "controle.pdf",
    createdAt: "2026-07-30T10:00:00Z",
  })
  assert.equal(image.type, "IMAGE")
  assert.equal(image.isCover, true)
  assert.equal(document.type, "PDF")
  assert.equal(document.visibility, "SIGNED")
  assert.equal(document.metadata.filesize, 2048)
})

test("le provider Supabase implémente upload, delete, move, copy, URLs et list", async () => {
  const calls: string[] = []
  const client: SupabaseStorageClient = {
    storage: {
      from(bucket) {
        return {
          async upload(path) {
            calls.push(`upload:${bucket}:${path}`)
            return { data: { path }, error: null }
          },
          async remove(paths) {
            calls.push(`delete:${bucket}:${paths.join(",")}`)
            return { error: null }
          },
          async move(from, to) {
            calls.push(`move:${bucket}:${from}:${to}`)
            return { error: null }
          },
          async copy(from, to) {
            calls.push(`copy:${bucket}:${from}:${to}`)
            return { error: null }
          },
          getPublicUrl(path) {
            return { data: { publicUrl: `https://public/${bucket}/${path}` } }
          },
          async createSignedUrl(path, expiresIn) {
            calls.push(`signed:${bucket}:${path}:${expiresIn}`)
            return { data: { signedUrl: `https://signed/${path}` }, error: null }
          },
          async list(path) {
            calls.push(`list:${bucket}:${path}`)
            return {
              data: [{ name: "photo.jpg", updated_at: "2026-07-30", metadata: { size: 123 } }],
              error: null,
            }
          },
        }
      },
    },
  }
  const provider = new SupabaseMediaStorageProvider(client)
  await provider.upload({ bucket: "media", path: "a.jpg", body: new Uint8Array([1]) })
  await provider.delete("media", ["a.jpg"])
  await provider.move("media", "a.jpg", "b.jpg")
  await provider.copy("media", "b.jpg", "c.jpg")
  assert.equal(provider.getPublicUrl("media", "c.jpg"), "https://public/media/c.jpg")
  assert.equal(await provider.getSignedUrl("media", "c.jpg", 60), "https://signed/c.jpg")
  assert.equal((await provider.list("media", "folder"))[0].path, "folder/photo.jpg")
  assert.equal(calls.length, 6)
})
