import assert from "node:assert/strict"
import test from "node:test"
import { vehicles } from "@/features/public/data"
import { marketListingsFixture } from "../models/market-listings.fixture"
import { buildMarketDashboard, formatMarketCurrency, toMarketVehicle } from "./market-dashboard"

test("adapte un Vehicle complet sans mutation", () => {
  const source = structuredClone(vehicles[0])
  const before = structuredClone(source)
  assert.deepEqual(toMarketVehicle(source), {
    id: source.id, brand: source.brand, model: source.model, trim: source.trim,
    year: source.year, price: source.sellingPrice, mileage: source.mileage,
    fuel: source.fuel, gearbox: source.gearbox,
  })
  assert.deepEqual(source, before)
})

test("adapte les champs optionnels absents", () => {
  const source = { ...structuredClone(vehicles[0]), sellingPrice: undefined, mileage: undefined, fuel: undefined, gearbox: undefined }
  const result = toMarketVehicle(source)
  assert.equal(result.price, undefined)
  assert.equal(result.mileage, undefined)
  assert.equal(result.fuel, undefined)
  assert.equal(result.gearbox, undefined)
})

test("formate les montants en français et gère null", () => {
  assert.match(formatMarketCurrency(42990) ?? "", /42[\s\u202f]990/)
  assert.equal(formatMarketCurrency(null), null)
})

test("prépare les états vides véhicule et marché", () => {
  assert.match(buildMarketDashboard({ vehicles: [], listings: marketListingsFixture }).emptyState?.title ?? "", /Aucun véhicule/)
  assert.match(buildMarketDashboard({ vehicles, listings: [] }).emptyState?.title ?? "", /données marché/)
})

test("prépare KPIs, insights et priorités déterministes", () => {
  const first = buildMarketDashboard({ vehicles, listings: marketListingsFixture })
  const second = buildMarketDashboard({ vehicles, listings: marketListingsFixture })
  assert.equal(first.vehicles.length, vehicles.length)
  assert.ok(first.summary.some((item) => item.id === "analyzed" && item.value === "3"))
  assert.ok(first.summary.some((item) => item.id === "garage-price"))
  assert.ok(first.priorityActions.length <= 5)
  assert.deepEqual(second, first)
})

test("prépare statuts, messages, score, écarts et comparables sans mutation", () => {
  const sourceVehicles = structuredClone(vehicles)
  const sourceListings = structuredClone(marketListingsFixture)
  const before = structuredClone({ sourceVehicles, sourceListings })
  const dashboard = buildMarketDashboard({ vehicles: sourceVehicles, listings: sourceListings })
  const bmw = dashboard.vehicles.find((item) => item.vehicleId === "bmw-m3-2015")
  assert.ok(bmw)
  assert.ok(bmw?.position.label)
  assert.ok(bmw?.confidence.label)
  assert.ok(bmw?.competitiveness.label)
  assert.ok(bmw?.priceGap)
  assert.ok(bmw?.detail.comparables.length)
  assert.equal(bmw?.detail.comparables.every((row) => !row.title.includes("undefined")), true)
  assert.deepEqual({ sourceVehicles, sourceListings }, before)
})
