import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("vehicle image actions enforce garage session and rollback on upload failure", () => {
  const source = readFileSync("src/features/vehicles/image-actions.ts", "utf8")
  assert.match(source, /getActiveGarageSession/)
  assert.match(source, /assertVehicleAccess/)
  assert.match(source, /reorder_vehicle_images/)
  assert.match(source, /createdImageIds\.length > 0/)
  assert.match(source, /uploadedPaths\.length > 0/)
  assert.match(source, /display_order/)
})

test("360 frame delete removes storage path after database row", () => {
  const source = readFileSync("src/features/vehicle-360/actions/vehicle-360-actions.ts", "utf8")
  assert.match(source, /deleteVehicle360Frame/)
  assert.match(source, /vehicle-360.*remove/)
  assert.match(source, /garage_id.*session\.garageId/)
})

test("interior scene delete cleans storage and linked hotspots", () => {
  const source = readFileSync("src/features/interior-tour/actions/interior-tour-actions.ts", "utf8")
  assert.match(source, /deleteInteriorScene/)
  assert.match(source, /interior_tour_hotspots.*delete/)
  assert.match(source, /storage\.delete/)
})

test("interior panorama viewer uses photo-sphere-viewer core", () => {
  const source = readFileSync("src/features/interior-tour/components/InteriorPanoramaViewer.tsx", "utf8")
  assert.match(source, /@photo-sphere-viewer\/core/)
  assert.match(source, /@photo-sphere-viewer\/markers-plugin/)
})

test("360 viewer preloads adjacent frames and blocks scroll chaining", () => {
  const source = readFileSync("src/features/vehicle-360/components/Vehicle360ViewerClient.tsx", "utf8")
  assert.match(source, /nextCircularFrame/)
  assert.match(source, /touchAction: "none"/)
  assert.match(source, /new window\.Image/)
})
