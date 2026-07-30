import assert from "node:assert/strict"
import test from "node:test"
import { analyzeGeographicMarket, buildGeographicMarketViewModel, calculateDistanceKm } from ".."
import type { GarageMarketLocation, GeographicComparableInput } from "../types"

const origin: GarageMarketLocation = {
  postalCode: "59590",
  city: "Raismes",
  coordinates: { latitude: 50.389, longitude: 3.485 },
}

function comparable(
  externalId: string,
  latitude: number,
  longitude: number,
  advertisedPrice = 20_000
): GeographicComparableInput {
  return {
    externalId,
    advertisedPrice,
    location: "Nord",
    postalCode: "59000",
    coordinates: { latitude, longitude },
  }
}

test("calcule une distance Haversine reproductible", () => {
  const distance = calculateDistanceKm(
    { latitude: 48.8566, longitude: 2.3522 },
    { latitude: 50.6292, longitude: 3.0573 }
  )
  assert.ok(distance > 203 && distance < 206)
})

test("répartit les annonces dans les rayons inclusifs", () => {
  const analysis = analyzeGeographicMarket({
    origin,
    comparables: [
      comparable("near", 50.4, 3.49),
      comparable("medium", 50.8, 3.5),
      comparable("far", 51.2, 3.5),
      comparable("national", 48.85, 2.35),
    ],
  })
  assert.deepEqual(analysis.radii.map((item) => item.listingCount), [1, 2, 3])
  assert.equal(analysis.nationalListingCount, 4)
  assert.equal(analysis.comparables[0].zone, "LOCAL")
  assert.equal(analysis.comparables[2].zone, "REGIONAL")
})

test("calcule médianes, différence, Heat Score et signaux locaux", () => {
  const analysis = analyzeGeographicMarket({
    origin,
    comparables: [
      comparable("1", 50.4, 3.49, 24_000),
      comparable("2", 50.41, 3.5, 26_000),
      comparable("3", 48.85, 2.35, 20_000),
      comparable("4", 43.3, 5.4, 22_000),
    ],
  })
  assert.equal(analysis.localMedianPrice, 25_000)
  assert.equal(analysis.nationalMedianPrice, 23_000)
  assert.equal(analysis.localNationalDifferencePercent, 8.7)
  assert.ok(analysis.heatScore !== null)
  assert.ok(analysis.signals.some((signal) => signal.code === "LOCAL_OVERVALUED"))
  assert.ok(analysis.signals.some((signal) => signal.code === "LOCAL_RARE"))
})

test("reste déterministe sans coordonnées garage ou annonce", () => {
  const analysis = analyzeGeographicMarket({
    origin: { postalCode: "59590", city: "Raismes", coordinates: null },
    comparables: [{
      externalId: "1", advertisedPrice: 20_000, location: "Lille",
      postalCode: "59000", coordinates: null,
    }],
  })
  assert.equal(analysis.available, false)
  assert.equal(analysis.heatScore, null)
  assert.deepEqual(analysis.radii.map((item) => item.listingCount), [null, null, null])
  assert.equal(analysis.nationalListingCount, 1)
  assert.equal(analysis.mapPoints.length, 0)
})

test("builder prépare exclusivement les valeurs de présentation", () => {
  const view = buildGeographicMarketViewModel(analyzeGeographicMarket({
    origin,
    comparables: [comparable("1", 50.4, 3.49)],
  }))
  assert.equal(view.title, "Répartition géographique")
  assert.equal(view.metrics[0].label, "25 km")
  assert.match(view.metrics.at(-1)?.value ?? "", /100$/)
})
