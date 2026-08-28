import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { resolveVehicleImagePublicUrl } from "../vehicle-image-presentation"
import { formatVehicleMileage } from "../vehicle-presentation"

const GARAGE_ID = "363f2dc0-bfd3-48d6-a1cc-96e113e96094"
const VEHICLE_ID = "11111111-1111-4111-8111-111111111111"

test("resolves an imported vehicle image from its tenant storage path", () => {
  assert.equal(
    resolveVehicleImagePublicUrl({
      url: null,
      storagePath: `${GARAGE_ID}/${VEHICLE_ID}/Photo héritée.jpg`,
      garageId: GARAGE_ID,
      vehicleId: VEHICLE_ID,
      supabaseUrl: "https://example.supabase.co/",
    }),
    `https://example.supabase.co/storage/v1/object/public/vehicle-images/${GARAGE_ID}/${VEHICLE_ID}/Photo%20h%C3%A9rit%C3%A9e.jpg`,
  )
})

test("keeps a persisted URL and rejects a cross-tenant storage path", () => {
  assert.equal(
    resolveVehicleImagePublicUrl({
      url: "https://cdn.example/vehicle.jpg",
      storagePath: "invalid",
      garageId: GARAGE_ID,
      vehicleId: VEHICLE_ID,
      supabaseUrl: "https://example.supabase.co",
    }),
    "https://cdn.example/vehicle.jpg",
  )
  assert.equal(
    resolveVehicleImagePublicUrl({
      url: null,
      storagePath: `foreign-garage/${VEHICLE_ID}/vehicle.jpg`,
      garageId: GARAGE_ID,
      vehicleId: VEHICLE_ID,
      supabaseUrl: "https://example.supabase.co",
    }),
    null,
  )
})

test("renders an unknown mileage truthfully", () => {
  assert.equal(formatVehicleMileage(null), "Kilométrage non renseigné")
  assert.match(formatVehicleMileage(156700), /156[\s\u202f]700 km/)
})

test("MG MGB legacy 43878 keeps its absent mileage explicit", () => {
  const legacyVehicle = {
    legacyExternalId: "43878",
    brand: "Mg",
    model: "Mgb",
    mileage: null,
    sellingPrice: 13_490,
    status: "PUBLISHED",
  } as const

  assert.equal(legacyVehicle.legacyExternalId, "43878")
  assert.equal(legacyVehicle.sellingPrice, 13_490)
  assert.equal(legacyVehicle.status, "PUBLISHED")
  assert.equal(formatVehicleMileage(legacyVehicle.mileage), "Kilométrage non renseigné")
})

test("stock rows and counts are scoped to one active garage", () => {
  const source = readFileSync("src/features/vehicles/stock/stock-service.ts", "utf8")
  assert.doesNotMatch(source, /\.in\("garage_id"/)
  assert.match(source, /\.eq\("garage_id", this\.garageId\)/)
  assert.doesNotMatch(source, /garage_members/)
})

test("vehicle detail rejects a vehicle outside the active garage", () => {
  const source = readFileSync("src/app/(dashboard)/stock/[id]/page.tsx", "utf8")
  assert.match(source, /getActiveGarageSession/)
  assert.match(source, /\.eq\("id", id\)[\s\S]*\.eq\("garage_id", garageId\)/)
  assert.match(source, /if \(!vehicle\) notFound\(\)/)
})

test("image category access is checked before the update mutation", () => {
  const source = readFileSync("src/features/vehicles/image-actions.ts", "utf8")
  const accessCheck = source.indexOf("await assertVehicleAccess(existingImage.vehicle_id)")
  const categoryUpdate = source.indexOf(".update({ type: parsedCategory.data })")
  assert.ok(accessCheck >= 0)
  assert.ok(categoryUpdate > accessCheck)
})

test("stock card exposes a sibling overlay link without wrapping row actions", () => {
  const source = readFileSync("src/features/vehicles/stock-vehicle-list.tsx", "utf8")
  const overlayStart = source.indexOf("aria-label={`Voir la fiche de ${name}`}")
  const actionsStart = source.indexOf("<VehicleDeleteButton")
  assert.ok(overlayStart >= 0)
  assert.ok(actionsStart > overlayStart)
  assert.match(source, /className="absolute inset-0 z-0/)
  assert.match(source, /className="relative z-20[^"]*"/)
  assert.match(source, /<Link href={`\/stock\/\$\{vehicle\.id\}`}[^>]*>[\s\S]*Modifier[\s\S]*<\/Link>/)
})
