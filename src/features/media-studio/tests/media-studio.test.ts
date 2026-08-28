import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildMediaStudioSummary } from "../builders/media-studio-summary-builder"

test("media studio summary reflects photos, 360 and interior status", () => {
  const summary = buildMediaStudioSummary({
    vehicleId: "vehicle-1",
    vehicleName: "Peugeot 308",
    images: [
      { id: "img-1", url: "https://cdn.test/1.jpg", is_primary: true, display_order: 1 },
      { id: "img-2", url: "https://cdn.test/2.jpg", is_primary: false, display_order: 2 },
    ],
    sequence: {
      id: "seq-1",
      garageId: "garage-1",
      vehicleId: "vehicle-1",
      status: "READY",
      frameCount: 14,
      startFrameIndex: 0,
      isPublic: false,
      createdBy: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      publishedAt: null,
      frames: Array.from({ length: 14 }, (_, index) => ({
        id: `frame-${index}`,
        garageId: "garage-1",
        vehicleId: "vehicle-1",
        sequenceId: "seq-1",
        storagePath: `path/${index}.webp`,
        publicUrl: `https://cdn.test/${index}.webp`,
        position: index + 1,
        status: "READY" as const,
        width: null,
        height: null,
        fileSize: null,
        mimeType: "image/webp",
        checksum: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
    },
    tour: {
      id: "tour-1",
      garageId: "garage-1",
      vehicleId: "vehicle-1",
      status: "DRAFT",
      startSceneId: "scene-1",
      isPublic: false,
      createdBy: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      publishedAt: null,
      scenes: [
        {
          id: "scene-1",
          garageId: "garage-1",
          vehicleId: "vehicle-1",
          tourId: "tour-1",
          name: "Habitacle",
          storagePath: "garage-1/vehicle-1/tour-1/scene-1.webp",
          publicUrl: "https://cdn.test/scene.webp",
          position: 1,
          status: "READY",
          width: 4096,
          height: 2048,
          fileSize: 1000,
          mimeType: "image/webp",
          initialYaw: 0,
          initialPitch: 0,
          initialFov: 90,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      hotspots: [],
    },
  })

  assert.equal(summary.photos.count, 2)
  assert.equal(summary.photos.hasPrimary, true)
  assert.equal(summary.exterior360.state, "READY")
  assert.equal(summary.exterior360.readyFrameCount, 14)
  assert.equal(summary.interiorTour.state, "IN_PROGRESS")
  assert.equal(summary.interiorTour.readySceneCount, 1)
})

test("display order migration defines reorder RPC and public view column", () => {
  const migration = readFileSync(
    "supabase/migrations/20260827000050_add_vehicle_image_display_order.sql",
    "utf8",
  )
  assert.match(migration, /display_order/)
  assert.match(migration, /reorder_vehicle_images/)
  assert.match(migration, /public_live_vehicle_images/)
})

test("vehicle image storage paths remain tenant scoped", () => {
  const migration = readFileSync(
    "supabase/migrations/20260715000015_add_vehicle_image_storage_policies.sql",
    "utf8",
  )
  assert.match(migration, /storage\.foldername\(name\)\)\[1\]/)
})
