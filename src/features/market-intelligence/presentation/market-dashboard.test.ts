import assert from "node:assert/strict"
import test from "node:test"
import { vehicles } from "@/features/public/data"
import type { Vehicle } from "@/features/public/types"
import type { MarketListing } from "../engine"
import { marketListingsFixture } from "../models/market-listings.fixture"
import { buildMarketDashboard, formatMarketCurrency, toMarketVehicle } from "./market-dashboard"

function vehicleForMarket(id: string, brand: string, model: string, sellingPrice: number): Vehicle {
  return { ...structuredClone(vehicles[0]), id, slug: id, brand, model, sellingPrice }
}

function listingForVehicle(vehicle: Vehicle, id: string, price: number): MarketListing {
  return {
    id,
    source: "test",
    price,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    gearbox: vehicle.gearbox,
  }
}

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

test("calcule le prix moyen marché depuis les médianes numériques", () => {
  const first = vehicleForMarket("first", "Alfa Romeo", "Giulia", 20_000)
  const second = vehicleForMarket("second", "Volvo", "V60", 30_000)
  const dashboard = buildMarketDashboard({
    vehicles: [first, second],
    listings: [listingForVehicle(first, "first-listing", 10_000), listingForVehicle(second, "second-listing", 30_000)],
  })

  assert.equal(dashboard.summary.find(({ id }) => id === "market-price")?.value, formatMarketCurrency(20_000))
})

test("ne réinterprète pas les chaînes monétaires pour calculer la moyenne marché", () => {
  const first = vehicleForMarket("decimal-first", "Alfa Romeo", "Giulia", 20_000)
  const second = vehicleForMarket("decimal-second", "Volvo", "V60", 30_000)
  const dashboard = buildMarketDashboard({
    vehicles: [first, second],
    listings: [
      listingForVehicle(first, "decimal-first-listing", 10_000.1),
      listingForVehicle(second, "decimal-second-listing", 10_000.5),
    ],
  })

  assert.equal(dashboard.summary.find(({ id }) => id === "market-price")?.value, formatMarketCurrency(10_000.3))
  assert.notEqual(dashboard.summary.find(({ id }) => id === "market-price")?.value, formatMarketCurrency(10_000.5))
})

test("retourne l'état vide lorsque les listings ne produisent aucun comparable", () => {
  const dashboard = buildMarketDashboard({
    vehicles: [vehicleForMarket("target", "BMW", "M3", 42_990)],
    listings: [{ id: "unrelated", source: "test", price: 25_000, brand: "Audi", model: "A4" }],
  })

  assert.deepEqual(dashboard.emptyState, {
    title: "Pas encore assez de données marché",
    description: "Importez des annonces comparables pour obtenir des recommandations tarifaires.",
  })
})

test("n'ajoute aucune action neutre aux priorités", () => {
  const vehicle = vehicleForMarket("well-positioned", "BMW", "M3", 40_000)
  const listings = Array.from({ length: 10 }, (_, index) => listingForVehicle(vehicle, `market-${index}`, 40_000))
  const dashboard = buildMarketDashboard({ vehicles: [vehicle], listings })

  assert.deepEqual(dashboard.priorityActions, [])
})

test("limite les actions prioritaires à cinq", () => {
  const priorityVehicles = Array.from(
    { length: 6 },
    (_, index) => vehicleForMarket(`priority-${index}`, "BMW", "M3", 60_000)
  )
  const listings = Array.from(
    { length: 10 },
    (_, index) => listingForVehicle(priorityVehicles[0], `comparable-${index}`, 40_000)
  )
  const dashboard = buildMarketDashboard({ vehicles: priorityVehicles, listings })

  assert.equal(dashboard.priorityActions.length, 5)
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
