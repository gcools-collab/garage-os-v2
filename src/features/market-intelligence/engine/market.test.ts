import assert from "node:assert/strict"
import test from "node:test"
import { marketListingsFixture } from "../models/market-listings.fixture"
import {
  analyzeVehicleMarket,
  calculateAverage,
  calculateConfidence,
  calculateMedian,
  calculatePricePosition,
  createMarketEngine,
  selectComparables,
} from "."
import type { MarketListing, MarketVehicle } from "."

const vehicle: MarketVehicle = {
  id: "bmw-m3",
  brand: "BMW",
  model: "M3",
  year: 2015,
  mileage: 70_000,
  fuel: "Essence",
  gearbox: "Automatique",
  price: 35_000,
}

const comparable = (overrides: Partial<MarketListing> = {}): MarketListing => ({
  id: "listing",
  source: "test",
  brand: "BMW",
  model: "M3",
  year: 2016,
  mileage: 80_000,
  fuel: "Essence",
  gearbox: "Automatique",
  price: 40_000,
  ...overrides,
})

test("sélectionne marque, modèle, année, kilométrage, carburant et boîte comparables", () => {
  const listings = [
    comparable(),
    comparable({ id: "year", year: 2019 }),
    comparable({ id: "mileage", mileage: 120_000 }),
    comparable({ id: "fuel", fuel: "Diesel" }),
    comparable({ id: "model", model: "M4" }),
  ]
  assert.deepEqual(selectComparables(vehicle, listings).map((item) => item.id), ["listing"])
})

test("accepte les données comparables partielles et limite à vingt", () => {
  const partials = Array.from({ length: 25 }, (_, index) =>
    comparable({ id: `partial-${index}`, year: null, mileage: null })
  )
  assert.equal(selectComparables(vehicle, partials).length, 20)
})

test("calcule moyenne et médiane sans muter les valeurs", () => {
  const values = [30_000, 10_000, 20_000, 40_000]
  const before = [...values]
  assert.equal(calculateAverage(values), 25_000)
  assert.equal(calculateMedian(values), 25_000)
  assert.deepEqual(values, before)
  assert.equal(calculateMedian([]), null)
})

test("calcule minimum, maximum, moyenne, médiane et recommandation", () => {
  const analysis = analyzeVehicleMarket(vehicle, [
    comparable({ id: "a", price: 30_000 }),
    comparable({ id: "b", price: 40_000 }),
    comparable({ id: "c", price: 50_000 }),
  ])
  assert.equal(analysis.minPrice, 30_000)
  assert.equal(analysis.maxPrice, 50_000)
  assert.equal(analysis.averagePrice, 40_000)
  assert.equal(analysis.medianPrice, 40_000)
  assert.equal(analysis.recommendedPrice, 40_000)
})

test("gère zéro et une annonce avec confiance et warnings", () => {
  const empty = analyzeVehicleMarket(vehicle, [])
  assert.equal(empty.confidence, "VERY_LOW")
  assert.equal(empty.pricePosition, "UNKNOWN")
  assert.deepEqual(empty.warnings, ["NO_COMPARABLE", "NOT_ENOUGH_DATA"])
  assert.equal(analyzeVehicleMarket(vehicle, [comparable()]).confidence, "LOW")
})

test("fait évoluer la confiance selon le nombre de comparables", () => {
  assert.equal(calculateConfidence(2), "LOW")
  assert.equal(calculateConfidence(5), "MEDIUM")
  assert.equal(calculateConfidence(25), "HIGH")
})

test("positionne le prix et prépare score et opportunités", () => {
  assert.equal(calculatePricePosition(30_000, 40_000), "UNDER_MARKET")
  assert.equal(calculatePricePosition(40_000, 40_000), "MARKET")
  assert.equal(calculatePricePosition(50_000, 40_000), "OVER_MARKET")
  const high = analyzeVehicleMarket({ ...vehicle, price: 50_000 }, [comparable()])
  assert.equal(high.pricePosition, "OVER_MARKET")
  assert.ok(high.competitivenessScore !== null && high.competitivenessScore < 75)
  assert.ok(high.warnings.includes("PRICE_TOO_HIGH"))
  assert.ok(high.opportunities.includes("BAISSE_PRIX"))
})

test("classe la santé du marché avec peu ou beaucoup d’annonces", () => {
  const slow = analyzeVehicleMarket(vehicle, [comparable()])
  assert.equal(slow.marketHealth, "SLOW")
  assert.ok(slow.opportunities.includes("MARCHE_FAIBLE"))
  const many = Array.from({ length: 12 }, (_, index) =>
    comparable({ id: `many-${index}`, price: 35_000 + index * 100 })
  )
  const hot = analyzeVehicleMarket(vehicle, many)
  assert.equal(hot.marketHealth, "HOT")
  assert.ok(hot.opportunities.includes("MARCHE_FORT"))
})

test("exécute le pipeline injectable sans mutation", () => {
  const vehicles = [vehicle]
  const listings = structuredClone(marketListingsFixture)
  const before = structuredClone({ vehicles, listings })
  const engine = createMarketEngine({ vehicles, listings })
  const analysis = engine.analyzeVehicle(vehicle.id)
  assert.equal(analysis?.vehicleId, vehicle.id)
  assert.ok((analysis?.listingCount ?? 0) > 0)
  assert.equal(engine.analyzeVehicle("unknown"), null)
  assert.deepEqual({ vehicles, listings }, before)
})
