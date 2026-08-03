import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { Vehicle360GalleryBuilder, Vehicle360PublicationBuilder, Vehicle360SequenceEngine, Vehicle360ValidationEngine, Vehicle360ViewerBuilder, nextCircularFrame } from ".."
import type { Vehicle360Frame, Vehicle360Sequence } from "../types"

const frame = (position: number, overrides: Partial<Vehicle360Frame> = {}): Vehicle360Frame => ({
  id: `frame-${String(position).padStart(2, "0")}`, garageId: "garage-1", vehicleId: "vehicle-1", sequenceId: "sequence-1",
  storagePath: `garage-1/vehicle-1/sequence-1/frame-${position}.webp`, publicUrl: `https://cdn.example/frame-${position}.webp`,
  position, status: "READY", width: 1600, height: 1200, fileSize: 1_000_000, mimeType: "image/webp", checksum: null,
  createdAt: new Date(2026, 0, position).toISOString(), updatedAt: new Date(2026, 0, position).toISOString(), ...overrides,
})

const sequence = (count = 24, overrides: Partial<Vehicle360Sequence> = {}): Vehicle360Sequence => ({
  id: "sequence-1", garageId: "garage-1", vehicleId: "vehicle-1", status: "READY", frameCount: count,
  startFrameIndex: 0, isPublic: false, createdBy: "user-1", createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z", publishedAt: null,
  frames: Array.from({ length: count }, (_, index) => frame(index + 1)), ...overrides,
})

test("creates a deterministic ordered sequence", () => {
  const engine = new Vehicle360SequenceEngine()
  const ordered = engine.order([frame(3), frame(1), frame(2)])
  assert.deepEqual(ordered.map((item) => item.position), [1, 2, 3])
  assert.deepEqual(engine.reverse(ordered).map((item) => item.position), [1, 2, 3])
  assert.equal(engine.reverse(ordered)[0].id, "frame-03")
})

test("moves frames without mutating the source", () => {
  const source = [frame(1), frame(2), frame(3)]
  const moved = new Vehicle360SequenceEngine().move(source, "frame-02", -1)
  assert.deepEqual(moved.map((item) => item.id), ["frame-02", "frame-01", "frame-03"])
  assert.deepEqual(source.map((item) => item.id), ["frame-01", "frame-02", "frame-03"])
})

test("validates lifecycle publication and unpublication", () => {
  const engine = new Vehicle360SequenceEngine()
  assert.equal(engine.canTransition("READY", "PUBLISHED"), true)
  assert.equal(engine.canTransition("PUBLISHED", "READY"), true)
  assert.equal(engine.canTransition("DRAFT", "PUBLISHED"), false)
})

test("blocks fewer than 12 images and warns under 24", () => {
  const validator = new Vehicle360ValidationEngine()
  assert.equal(validator.validate(sequence(11)).blockers.some((item) => item.id === "minimum"), true)
  assert.equal(validator.validate(sequence(12)).warnings.some((item) => item.id === "minimum"), true)
  assert.equal(validator.validate(sequence(24)).ready, true)
})

test("detects inaccessible, duplicate and discontinuous frames", () => {
  const frames = [frame(1), frame(1, { id: "duplicate" }), frame(3, { publicUrl: null })]
  const coverage = new Vehicle360ValidationEngine().validate(sequence(3, { frames }))
  assert.deepEqual(coverage.blockers.map((item) => item.id).sort(), ["accessible", "minimum", "order", "positions"])
})

test("builds editor, media image projections and explicit start frame", () => {
  const editor = new Vehicle360GalleryBuilder().build(sequence(24, { startFrameIndex: 5 }), "BMW M3")
  assert.equal(editor.frames[5].isStart, true)
  assert.equal(editor.viewer?.startIndex, 5)
  assert.equal(editor.viewer?.frames[0].image.status, "READY")
  assert.match(editor.viewer?.frames[0].image.alt ?? "", /BMW M3/)
})

test("public builder only exposes a published sequence", () => {
  const builder = new Vehicle360PublicationBuilder()
  assert.equal(builder.build(null, "vehicle-1").state, "NOT_APPLICABLE")
  assert.equal(builder.build(sequence(), "vehicle-1").state, "WARNING")
  assert.equal(builder.build(sequence(24, { status: "PUBLISHED", isPublic: true }), "vehicle-1").state, "PASS")
})

test("viewer navigation is circular", () => {
  assert.equal(nextCircularFrame(0, -1, 24), 23)
  assert.equal(nextCircularFrame(23, 1, 24), 0)
  assert.equal(new Vehicle360ViewerBuilder().build(sequence(), "BMW M3")?.frames.length, 24)
})

test("React viewer contains presentation only and preserves classic gallery", () => {
  const viewer = readFileSync("src/features/vehicle-360/components/Vehicle360ViewerClient.tsx", "utf8")
  const page = readFileSync("src/features/public-site/vehicle-detail/components/PremiumVehicleDetailPage.tsx", "utf8")
  assert.doesNotMatch(viewer, /supabase|\.sort\(|\.filter\(/i)
  assert.match(page, /VehicleGallerySection/)
  assert.match(page, /Vehicle360ViewerClient/)
})

test("public projection requires published vehicle, sequence and active Live garage", () => {
  const migration = readFileSync("supabase/migrations/20260803000038_create_vehicle_360_experience.sql", "utf8")
  assert.match(migration, /s\.status = 'PUBLISHED'/)
  assert.match(migration, /v\.publication_status = 'PUBLISHED'/)
  assert.match(migration, /g\.live_enabled = true/)
  assert.match(migration, /gm\.role in \('owner','admin'\)/)
})
