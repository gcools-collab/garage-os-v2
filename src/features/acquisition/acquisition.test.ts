import assert from "node:assert/strict"
import test from "node:test"

import {
  deduplicateModelFromTrim,
  getVehicleDisplayTitle,
} from "./acquisition-presentation"
import {
  getCompletenessChecks,
  getCompletenessPercentage,
} from "./completeness"
import {
  mapLeboncoinAcquisitionListing,
  type BridgeListing,
} from "./providers/leboncoin-provider"
import type { DraftVehicle } from "./types"
import {
  buildMarketplaceRefreshPlan,
  requireAccessibleMarketplaceLink,
} from "./marketplace-link-refresh"
import { VehicleAcquisitionService } from "./vehicle-acquisition-service"

function attribute(
  key: string,
  keyLabel: string,
  value: string,
  valueLabel = value
) {
  return { key, keyLabel, value, valueLabel, values: [], valuesLabel: [] }
}

function listing(
  subject: string,
  attributes: BridgeListing["attributes"]
): BridgeListing {
  return {
    id: "fixture-id",
    subject,
    body: "Annonce automobile de collection",
    brand: "leboncoin",
    url: "https://www.leboncoin.fr/ad/voitures/1710970399",
    price: 42_000,
    images: ["https://img.leboncoin.fr/fixture.jpg"],
    attributes,
    ownerType: "private",
    firstPublicationDate: "2026-07-01T12:00:00Z",
    favoriteCount: 10,
    location: {
      city: "Paris",
      cityLabel: "Paris 75000",
      zipcode: "75000",
      departmentName: "Paris",
      regionName: "Île-de-France",
    },
  }
}

function draftFrom(source: BridgeListing): DraftVehicle {
  return {
    provider: "leboncoin",
    sourceUrl: source.url,
    ...mapLeboncoinAcquisitionListing(source),
  }
}

test("maps Jaguar Type E Série 1 from constructor attributes", () => {
  const draft = draftFrom(
    listing("Jaguar Type E série 1 1966", {
      model: attribute("model", "Modèle", "V12"),
      u_car_brand: attribute("u_car_brand", "Marque", "JAGUAR"),
      u_car_model: attribute("u_car_model", "Modèle", "JAGUAR_Type E", "Type E"),
      u_car_version: attribute(
        "u_car_version",
        "Version Constructeur",
        "Type E TYPE E Série 1",
        "Type E TYPE E Série 1"
      ),
      regdate: attribute("regdate", "Année modèle", "1966"),
      horsepower: attribute("horsepower", "Puissance fiscale", "24", "24 Cv"),
      horse_power_din: attribute("horse_power_din", "Puissance DIN", "265", "265 Ch"),
    })
  )

  assert.equal(getVehicleDisplayTitle(draft), "Jaguar Type E Série 1")
  assert.equal(draft.year, 1966)
  assert.equal(draft.characteristics.powerDin, 265)
  assert.equal(draft.characteristics.fiscalPower, 24)
})

test("preserves marketplace price, favorites and publication date for a new import", () => {
  const draft = draftFrom(listing("Jaguar Type E série 1 1966", {}))
  assert.equal(draft.advertisedPrice, 42_000)
  assert.equal(draft.favoriteCount, 10)
  assert.equal(draft.publishedAt, "2026-07-01T12:00:00Z")
})

test("repairs an incomplete legacy marketplace link", () => {
  const draft = draftFrom(listing("Jaguar Type E série 1 1966", {}))
  const plan = buildMarketplaceRefreshPlan(
    { publishedAt: "2026-06-01T10:00:00Z", vehicleStatus: "PURCHASED", vehicleSellingPrice: null },
    draft,
    new Date("2026-07-16T12:00:00Z")
  )
  assert.equal(plan.link.status, "ACTIVE")
  assert.equal(plan.link.advertised_price, 42_000)
  assert.equal(plan.link.favorite_count, 10)
  assert.equal(plan.vehicleSellingPrice, 42_000)
  assert.equal(plan.publishVehicle, true)
})

test("does not overwrite a manually corrected selling price", () => {
  const draft = draftFrom(listing("Jaguar Type E série 1 1966", {}))
  const plan = buildMarketplaceRefreshPlan(
    { publishedAt: null, vehicleStatus: "PUBLISHED", vehicleSellingPrice: 45_000 },
    draft,
    new Date("2026-07-16T12:00:00Z")
  )
  assert.equal(plan.link.advertised_price, 42_000)
  assert.equal(plan.vehicleSellingPrice, null)
  assert.equal(plan.publishVehicle, false)
})

test("accepts a marketplace response without favorites", () => {
  const source = listing("Jaguar Type E série 1 1966", {})
  source.favoriteCount = null
  const plan = buildMarketplaceRefreshPlan(
    { publishedAt: null, vehicleStatus: "PURCHASED", vehicleSellingPrice: null },
    draftFrom(source),
    new Date("2026-07-16T12:00:00Z")
  )
  assert.equal(plan.link.favorite_count, null)
})

test("reports an inaccessible marketplace listing", async () => {
  const service = new VehicleAcquisitionService([{
    id: "leboncoin",
    supports: () => true,
    getListing: async () => { throw new Error("Annonce indisponible") },
  }])
  await assert.rejects(
    service.acquire("https://www.leboncoin.fr/ad/voitures/1710970399"),
    /Annonce indisponible/
  )
})

test("rejects a marketplace link hidden by garage RLS", () => {
  assert.throws(
    () => requireAccessibleMarketplaceLink(null),
    /Annonce introuvable ou inaccessible/
  )
})

test("maps Peugeot 308 GT Line", () => {
  const draft = draftFrom(
    listing("Peugeot 308 GT Line", {
      u_car_brand: attribute("u_car_brand", "Marque", "PEUGEOT", "Peugeot"),
      u_car_model: attribute("u_car_model", "Modèle", "PEUGEOT_308", "308"),
      u_car_version: attribute("u_car_version", "Version Constructeur", "308 GT Line", "308 GT Line"),
    })
  )
  assert.equal(getVehicleDisplayTitle(draft), "Peugeot 308 GT Line")
})

test("maps Renault Clio Blue dCi 115", () => {
  const draft = draftFrom(
    listing("Renault Clio Blue dCi 115", {
      u_car_brand: attribute("u_car_brand", "Marque", "RENAULT", "Renault"),
      u_car_model: attribute("u_car_model", "Modèle", "RENAULT_Clio", "Clio"),
      u_car_version: attribute("u_car_version", "Version Constructeur", "Clio Blue dCi 115", "Clio Blue dCi 115"),
    })
  )
  assert.equal(getVehicleDisplayTitle(draft), "Renault Clio Blue dCi 115")
})

test("falls back to a cleaned original title for a partial listing", () => {
  const draft = draftFrom(listing("Peugeot 308 GT Line 2021", {}))
  assert.equal(getVehicleDisplayTitle(draft), "Peugeot 308 GT Line")
})

test("manual model and trim corrections update title and completeness", () => {
  const initial = draftFrom(listing("Annonce véhicule", {}))
  const initialScore = getCompletenessPercentage(
    getCompletenessChecks(initial, false)
  )
  const corrected: DraftVehicle = {
    ...initial,
    brand: "Renault",
    model: "Clio",
    trim: "RS",
    year: 2022,
    mileage: 20_000,
    characteristics: {
      ...initial.characteristics,
      fuel: "Essence",
      gearbox: "Manuelle",
      color: "Rouge",
    },
  }
  const correctedScore = getCompletenessPercentage(
    getCompletenessChecks(corrected, true)
  )

  assert.equal(getVehicleDisplayTitle(corrected), "Renault Clio RS")
  assert.ok(correctedScore > initialScore)
})

test("deduplicates model prefixes from versions without altering other trims", () => {
  const cases = [
    ["Type E", "TYPE E Série 1", "Série 1"],
    ["Type E", "Type  E / TYPE-E · Série 1", "Série 1"],
    ["308", "308 GT Line", "GT Line"],
    ["Clio", "CLIO RS Line", "RS Line"],
    ["Golf", "GTI", "GTI"],
  ] as const

  for (const [model, trim, expected] of cases) {
    assert.equal(deduplicateModelFromTrim(model, trim), expected)
  }
})
