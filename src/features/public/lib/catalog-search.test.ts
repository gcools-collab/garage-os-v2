import assert from "node:assert/strict"
import test from "node:test"
import { buildVehicleSearchDocument, normalizeCatalogText, tokenizeCatalogQuery } from "./catalog-search"

test("normalise accents, ponctuation et espaces", () => {
  assert.equal(normalizeCatalogText("  Électrique, B.M.W.  "), "electrique b m w")
  assert.equal(normalizeCatalogText("308 GT-Line"), "308 gt line")
})

test("ignore les lettres seules mais conserve les chiffres", () => {
  assert.deepEqual(tokenizeCatalogQuery("e M3 3"), ["m3", "3"])
  assert.deepEqual(tokenizeCatalogQuery(""), [])
})

test("indexe équipements et collections", () => {
  const document = buildVehicleSearchDocument({
    id: "1", slug: "bmw", brand: "BMW", model: "M3", year: 2015,
    equipmentGroups: [{ id: "comfort", label: "Confort", items: ["Sièges chauffants"] }],
    images: [], public: true, available: true, featured: false,
    featuredPriority: 0, addedAt: "2026-01-01", collectionIds: ["sport"],
  }, [{ id: "sport", slug: "sport", name: "Sport & Prestige", vehicleIds: ["1"], active: true, order: 1 }])
  assert.match(document, /bmw m3 2015/)
  assert.match(document, /sieges chauffants/)
  assert.match(document, /sport prestige/)
})
