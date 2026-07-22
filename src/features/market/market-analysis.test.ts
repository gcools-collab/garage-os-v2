import assert from "node:assert/strict"
import test from "node:test"

import { DeterministicMatchingEngine, prepareComparableListings } from "./matching"
import { mapLeboncoinListing } from "./providers/leboncoin/mapper"
import type { LeboncoinListing } from "./providers/leboncoin/types"
import { calculateMarketPosition, calculateMarketStatistics, buildMarketSearchCriteria } from "./services"
import type { MarketListing } from "./types"

const criteria = buildMarketSearchCriteria({ brand: "Peugeot", model: "308", trim: "GT Line", year: 2020, mileage: 80_000, fuel: "Diesel", gearbox: "Automatique", powerDin: 130 })
const listing = (overrides: Partial<MarketListing> = {}): MarketListing => ({ providerId: "leboncoin", externalId: "1", url: "https://example.test/1", title: "Peugeot 308 GT Line", brand: "PEUGEOT", model: "308", trim: "308 GT Line", year: 2020, mileage: 82_000, fuel: "diesel", gearbox: "automatique", powerDin: 130, price: 18_000, currency: "EUR", location: "Paris", sellerType: "PROFESSIONAL", publishedAt: "2026-07-12T00:00:00Z", imageUrls: [], favoriteCount: null, ...overrides })

test("construit les critères V1 centralisés", () => {
  assert.deepEqual(criteria, { brand: "Peugeot", model: "308", trim: "GT Line", yearFrom: 2018, yearTo: 2022, mileageFrom: 50_000, mileageTo: 110_000, fuel: "Diesel", gearbox: "Automatique", powerDinFrom: 100, powerDinTo: 160, limit: 30 })
})

test("refuse les données minimales incomplètes", () => {
  assert.throws(() => buildMarketSearchCriteria({ brand: "", model: "308", trim: null, year: 2020, mileage: 80_000, fuel: "Diesel", gearbox: null, powerDin: null }), /marque/)
})

test("score une comparable et explique le score", async () => {
  const [match] = await new DeterministicMatchingEngine().match(criteria, [listing()])
  assert.ok(match.score >= 90)
  assert.ok(match.reasons.includes("Marque et modèle identiques"))
})

test("exclut une autre marque et les données aberrantes", async () => {
  const matches = await new DeterministicMatchingEngine().match(criteria, [listing({ brand: "Renault" }), listing({ externalId: "2", price: -1 })])
  assert.equal(matches.length, 0)
})

test("calcule médiane, moyennes et populations", async () => {
  const matches = await new DeterministicMatchingEngine().match(criteria, [listing({ price: 10_000 }), listing({ externalId: "2", price: 20_000, sellerType: "PRIVATE", publishedAt: "2026-07-02T00:00:00Z" })])
  const stats = calculateMarketStatistics(matches, new Date("2026-07-22T00:00:00Z"))
  assert.equal(stats.medianPrice, 15_000)
  assert.equal(stats.averageListingAgeDays, 15)
  assert.equal(stats.professionalCount, 1)
  assert.equal(stats.privateCount, 1)
})

test("gère une liste vide", () => {
  assert.equal(calculateMarketStatistics([]).medianPrice, null)
})

test("positionne sous, dans et au-dessus du marché", () => {
  assert.equal(calculateMarketPosition(9_000, 10_000)?.positioning, "BELOW_MARKET")
  assert.equal(calculateMarketPosition(10_500, 10_000)?.positioning, "IN_MARKET")
  assert.equal(calculateMarketPosition(11_000, 10_000)?.positioning, "ABOVE_MARKET")
  assert.equal(calculateMarketPosition(null, 10_000), null)
})

const bmwCriteria = buildMarketSearchCriteria({ brand: "BMW", model: "M3", trim: null, year: 2015, mileage: 156_700, fuel: "Essence", gearbox: "Automatique", powerDin: null })
const bmwListing = (overrides: Partial<MarketListing> = {}): MarketListing => listing({
  externalId: "m3-1", url: "https://www.leboncoin.fr/ad/voitures/1000001", title: "BMW M3 F80",
  brand: "BMW", model: "M3", trim: null, year: 2015, mileage: 156_700, fuel: "Essence",
  gearbox: "Automatique", powerDin: null, price: 42_990, location: "Raismes 59590", ...overrides,
})

const rawLeboncoinListing = (overrides: Partial<LeboncoinListing> = {}): LeboncoinListing => ({
  id: "1000001", subject: "BMW M3", body: null, brand: "leboncoin", model: "M3",
  url: "https://www.leboncoin.fr/ad/voitures/1000001", price: 42_990, images: [],
  attributes: { u_car_brand: { key: "u_car_brand", keyLabel: "Marque", value: "BMW", valueLabel: "Bmw", values: [], valuesLabel: [] } },
  location: null, ownerType: "unknown", firstPublicationDate: null, favoriteCount: null, ...overrides,
})

test("privilégie la marque automobile et ignore la marque fournisseur", () => {
  assert.equal(mapLeboncoinListing(rawLeboncoinListing()).brand, "Bmw")
  assert.equal(mapLeboncoinListing(rawLeboncoinListing({ attributes: {} })).brand, "")
})

for (const model of ["M3", "M3 F80", "M3 Competition", "M3 CS"]) {
  test(`accepte la famille BMW ${model}`, async () => {
    const matches = await new DeterministicMatchingEngine().match(bmwCriteria, [bmwListing({ model })])
    assert.equal(matches.length, 1)
  })
}

test("accepte Série 3 seulement avec un titre BMW M3 explicite", async () => {
  const matches = await new DeterministicMatchingEngine().match(bmwCriteria, [bmwListing({ model: "Série 3", title: "BMW M3 F80 431 ch" })])
  assert.equal(matches.length, 1)
})

for (const model of ["M135i", "M140i", "M235i", "M4"]) {
  test(`rejette BMW ${model}`, async () => {
    const matches = await new DeterministicMatchingEngine().match(bmwCriteria, [bmwListing({ model, title: `BMW ${model}` })])
    assert.equal(matches.length, 0)
  })
}

test("exclut l'annonce source par externalId", () => {
  const prepared = prepareComparableListings([bmwListing()], [{ providerId: "leboncoin", externalId: "m3-1", url: null }])
  assert.equal(prepared.length, 0)
})

test("exclut l'annonce source par URL normalisée", () => {
  const prepared = prepareComparableListings([bmwListing()], [{ providerId: "leboncoin", externalId: null, url: "https://www.leboncoin.fr/ad/voitures/1000001/?tracking=1" }])
  assert.equal(prepared.length, 0)
})

test("supprime un doublon par externalId", () => {
  const prepared = prepareComparableListings([bmwListing(), bmwListing({ url: "https://example.test/autre" })])
  assert.equal(prepared.length, 1)
})

test("supprime un doublon fonctionnel", () => {
  const prepared = prepareComparableListings([
    bmwListing({ externalId: "a", url: "https://example.test/a" }),
    bmwListing({ externalId: "b", url: "https://example.test/b" }),
  ])
  assert.equal(prepared.length, 1)
})

test("année et kilométrage absents restent neutres", async () => {
  const matches = await new DeterministicMatchingEngine().match(bmwCriteria, [bmwListing({ year: null, mileage: null })])
  assert.equal(matches.length, 1)
  assert.equal(matches[0].score, 65)
  assert.deepEqual(matches[0].reasons, ["Marque et modèle identiques", "Même carburant", "Même boîte"])
})
