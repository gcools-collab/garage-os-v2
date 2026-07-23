import assert from "node:assert/strict"
import test from "node:test"
import { buildCatalogHref, normalizeCatalogSearchParams } from "./catalog-query"

test("normalise les chaînes, tableaux et valeurs absentes", () => {
  assert.deepEqual(normalizeCatalogSearchParams({
    brand: ["BMW", "Peugeot"],
    fuel: "Essence",
  }), { brand: "BMW", fuel: "Essence" })
})

test("ignore prix, page et tri invalides", () => {
  assert.deepEqual(normalizeCatalogSearchParams({
    minPrice: "abc",
    maxPrice: "-1",
    page: "0",
    sort: "unknown",
  }), {})
})

test("construit les URLs avec URLSearchParams", () => {
  assert.equal(
    buildCatalogHref({ brand: "BMW", fuel: "Essence" }, { brand: undefined }),
    "/vehicles?fuel=Essence"
  )
})
