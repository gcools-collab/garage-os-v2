import assert from "node:assert/strict"
import test from "node:test"
import { collections, garage, services, vehicles } from "../data"
import type { LiveEngineData } from "../types"
import { createLiveEngine } from "./live-engine"

function createFixture(): LiveEngineData {
  return structuredClone({ garage, vehicles, collections, services })
}

test("sélectionne en priorité le véhicule Hero explicite", () => {
  const data = createFixture()
  data.garage.live.hero.vehicleId = "renault-clio-rs-line"
  assert.equal(createLiveEngine(data).getHeroContent().vehicle?.id, "renault-clio-rs-line")
})

test("utilise le véhicule featured de priorité la plus élevée sans Hero explicite", () => {
  const data = createFixture()
  data.garage.live.hero.vehicleId = "vehicle-inconnu"
  assert.equal(createLiveEngine(data).getHeroContent().vehicle?.id, "bmw-m3-2015")
})

test("retourne un Hero éditorial de fallback sans véhicule éligible", () => {
  const data = createFixture()
  data.vehicles = []
  const hero = createLiveEngine(data).getHeroContent()
  assert.equal(hero.mode, "fallback")
  assert.equal(hero.vehicle, null)
  assert.equal(hero.title, data.garage.live.hero.title)
})

test("exclut les véhicules indisponibles par défaut et respecte la limite", () => {
  const data = createFixture()
  data.vehicles[0].available = false
  const result = createLiveEngine(data).getFeaturedVehicles({ limit: 1 })
  assert.equal(result.length, 1)
  assert.notEqual(result[0].id, data.vehicles[0].id)
})

test("peut inclure les véhicules indisponibles explicitement", () => {
  const data = createFixture()
  data.vehicles[0].available = false
  const result = createLiveEngine(data).getFeaturedVehicles({ includeUnavailable: true })
  assert.equal(result.some((vehicle) => vehicle.id === data.vehicles[0].id), true)
})

test("prépare une image fallback pour un véhicule sans photo", () => {
  const data = createFixture()
  const vehicle = createLiveEngine(data)
    .getFeaturedVehicles()
    .find((candidate) => candidate.id === "peugeot-308-gt-line")
  assert.equal(
    vehicle?.image?.url,
    data.garage.live.vehicleFallbackImageUrl
  )
})

test("masque les collections sans véhicule public disponible", () => {
  const data = createFixture()
  data.vehicles = data.vehicles.map((vehicle) => ({ ...vehicle, available: false }))
  assert.deepEqual(createLiveEngine(data).getVisibleCollections(), [])
})

test("résout la couverture depuis le premier véhicule éligible", () => {
  const data = createFixture()
  data.collections = [{
    id: "m3",
    slug: "m3",
    name: "M3",
    vehicleIds: ["bmw-m3-2015"],
    active: true,
    order: 1,
  }]
  const [collection] = createLiveEngine(data).getVisibleCollections()
  assert.equal(collection.resolvedCoverImageUrl, "/live/vehicles/sports-sedan-hero.png")
  assert.equal(collection.availableVehicleCount, 1)
})

test("exclut les services inactifs ou non publics", () => {
  const data = createFixture()
  data.services[0].active = false
  data.services[1].public = false
  assert.deepEqual(
    createLiveEngine(data).getVisibleServices().map((service) => service.id),
    ["financing"]
  )
})

test("génère la navigation uniquement depuis les modules activés", () => {
  const data = createFixture()
  data.garage.live.modules = data.garage.live.modules.map((module) => ({
    ...module,
    enabled: module.id === "catalog" || module.id === "contact",
  }))
  assert.deepEqual(
    createLiveEngine(data).getLiveHomepage().navigation.map((item) => item.id),
    ["catalog", "contact"]
  )
})

test("ne modifie pas les données sources pendant la composition", () => {
  const data = createFixture()
  const before = structuredClone(data)
  const engine = createLiveEngine(data)
  engine.getHeroContent()
  engine.getFeaturedVehicles()
  engine.getVisibleCollections()
  engine.getVisibleServices()
  engine.getLiveHomepage()
  assert.deepEqual(data, before)
})

test("résout une fiche publique par son slug exact", () => {
  const detail = createLiveEngine(createFixture()).getVehicleDetailBySlug("bmw-m3-2015")
  assert.equal(detail?.displayName, "BMW M3 F80")
  assert.equal(detail?.status, "available")
})

test("refuse un véhicule privé et un slug inconnu", () => {
  const data = createFixture()
  data.vehicles[0].public = false
  const engine = createLiveEngine(data)
  assert.equal(engine.getVehicleDetailBySlug(data.vehicles[0].slug), null)
  assert.equal(engine.getVehicleDetailBySlug("slug-inconnu"), null)
})

test("conserve accessible un véhicule public indisponible", () => {
  const data = createFixture()
  data.vehicles[0].available = false
  const detail = createLiveEngine(data).getVehicleDetailBySlug(data.vehicles[0].slug)
  assert.equal(detail?.status, "unavailable")
})

test("déduplique les images et place l’image principale en premier", () => {
  const data = createFixture()
  data.vehicles[0].images = [
    { id: "secondary", url: "/secondary.jpg", alt: "Secondaire", isPrimary: false },
    { id: "duplicate", url: "/primary.jpg", alt: "Doublon", isPrimary: false },
    { id: "primary", url: "/primary.jpg", alt: "Principale", isPrimary: true },
  ]
  const detail = createLiveEngine(data).getVehicleDetailBySlug(data.vehicles[0].slug)
  assert.deepEqual(detail?.images.map((image) => image.id), ["primary", "secondary"])
  assert.equal(detail?.primaryImage?.id, "primary")
})

test("prépare un fallback lorsque la fiche ne possède aucune image", () => {
  const data = createFixture()
  data.vehicles[0].images = []
  const detail = createLiveEngine(data).getVehicleDetailBySlug(data.vehicles[0].slug)
  assert.equal(detail?.images.length, 1)
  assert.equal(detail?.primaryImage?.url, data.garage.live.vehicleFallbackImageUrl)
})

test("prépare uniquement les actions de contact configurées", () => {
  const data = createFixture()
  data.garage.live.contact = {
    phone: "+33 3 00 00 00 00",
    whatsapp: "+33 6 00 00 00 00",
  }
  const detail = createLiveEngine(data).getVehicleDetailBySlug(data.vehicles[0].slug)
  assert.deepEqual(detail?.contactActions.map((action) => action.id), ["phone", "whatsapp"])
  assert.equal(detail?.contactActions[0].href, "tel:+33300000000")
  assert.equal(detail?.contactActions[1].href, "https://wa.me/33600000000")
})

test("ne modifie pas les sources pendant la préparation d’une fiche", () => {
  const data = createFixture()
  const before = structuredClone(data)
  createLiveEngine(data).getVehicleDetailBySlug(data.vehicles[0].slug)
  assert.deepEqual(data, before)
})

test("génère uniquement les slugs des véhicules publics", () => {
  const data = createFixture()
  data.vehicles[0].public = false
  assert.deepEqual(
    createLiveEngine(data).getPublicVehicleSlugs(),
    data.vehicles.slice(1).map((vehicle) => vehicle.slug)
  )
})

test("nettoie la description et déduplique les points forts", () => {
  const data = createFixture()
  data.vehicles[0].description = "  Une   sportive exigeante.  "
  data.vehicles[0].highlights = ["  Suivi complet ", "", "suivi complet", "Garantie"]
  const description = createLiveEngine(data)
    .getVehicleDetailBySlug(data.vehicles[0].slug)?.description
  assert.deepEqual(description, {
    introduction: "Une sportive exigeante.",
    highlights: ["Suivi complet", "Garantie"],
  })
})

test("masque les groupes de caractéristiques sans valeur", () => {
  const data = createFixture()
  data.vehicles = data.vehicles.map((vehicle, index) => index === 2 ? {
    ...vehicle,
    year: undefined,
    mileage: undefined,
    fuel: undefined,
    gearbox: undefined,
  } : vehicle)
  const groups = createLiveEngine(data)
    .getVehicleDetailBySlug(data.vehicles[2].slug)?.specifications
  assert.deepEqual(groups, [])
})

test("nettoie les équipements et masque les groupes incomplets", () => {
  const data = createFixture()
  data.vehicles[0].equipmentGroups = [
    { id: "comfort", label: " Confort ", items: [" GPS ", "gps", ""] },
    { id: "empty", label: "", items: ["Équipement"] },
    { id: "no-items", label: "Vide", items: [" "] },
  ]
  const groups = createLiveEngine(data)
    .getVehicleDetailBySlug(data.vehicles[0].slug)?.equipmentGroups
  assert.deepEqual(groups, [{ id: "comfort", title: "Confort", items: ["GPS"] }])
})

test("prépare uniquement les réassurances activées et complètes", () => {
  const data = createFixture()
  data.garage.live.vehicleTrustItems = [
    { id: "valid", enabled: true, icon: "shield", title: " Garantie ", description: " 12 mois " },
    { id: "disabled", enabled: false, icon: "history", title: "Historique", description: "Disponible" },
    { id: "incomplete", enabled: true, icon: "support", title: "", description: "Contact" },
  ]
  const items = createLiveEngine(data)
    .getVehicleDetailBySlug(data.vehicles[0].slug)?.trustItems
  assert.deepEqual(items, [{
    id: "valid",
    icon: "shield",
    title: "Garantie",
    description: "12 mois",
  }])
})

test("sélectionne au maximum trois similaires publics et disponibles", () => {
  const data = createFixture()
  const base = data.vehicles[1]
  data.vehicles = [
    ...data.vehicles,
    { ...structuredClone(base), id: "similar-4", slug: "similar-4" },
    { ...structuredClone(base), id: "private", slug: "private", public: false },
    { ...structuredClone(base), id: "unavailable", slug: "unavailable", available: false },
  ]
  const similar = createLiveEngine(data).getSimilarVehicles(data.vehicles[0].id)
  assert.equal(similar.length, 3)
  assert.equal(similar.some((vehicle) => vehicle.id === data.vehicles[0].id), false)
  assert.equal(similar.some((vehicle) => vehicle.id === "private"), false)
  assert.equal(similar.some((vehicle) => vehicle.id === "unavailable"), false)
})

test("priorise un véhicule de la même collection de façon déterministe", () => {
  const data = createFixture()
  data.vehicles[1].collectionIds = [data.vehicles[0].collectionIds[0]]
  const engine = createLiveEngine(data)
  const first = engine.getSimilarVehicles(data.vehicles[0].id)
  const second = engine.getSimilarVehicles(data.vehicles[0].id)
  assert.equal(first[0].id, data.vehicles[1].id)
  assert.deepEqual(second, first)
})

test("prépare une LiveVehicleCard sans exposer le véhicule brut", () => {
  const [card] = createLiveEngine(createFixture()).getFeaturedVehicles({ limit: 1 })
  assert.equal(card.displayName, "BMW M3 F80")
  assert.equal(card.href, "/vehicles/bmw-m3-2015")
  assert.equal(card.price, 42990)
  assert.equal(card.badge?.label, "Coup de cœur")
  assert.equal("brand" in card, false)
})

test("ne mute pas les sources pendant la préparation des similaires", () => {
  const data = createFixture()
  const before = structuredClone(data)
  createLiveEngine(data).getSimilarVehicles(data.vehicles[0].id)
  assert.deepEqual(data, before)
})

test("catalogue exclut les véhicules privés et indisponibles et retourne des cartes", () => {
  const data = createFixture()
  data.vehicles = [
    ...data.vehicles,
    { ...structuredClone(data.vehicles[0]), id: "private", slug: "private", public: false },
    { ...structuredClone(data.vehicles[0]), id: "unavailable", slug: "unavailable", available: false },
  ]
  const catalog = createLiveEngine(data).getVehicleCatalog()
  assert.equal(catalog.resultCount, 3)
  assert.equal(catalog.vehicles.every((vehicle) => "displayName" in vehicle && !("brand" in vehicle)), true)
})

test("catalogue filtre une collection valide et ignore une collection inconnue", () => {
  const engine = createLiveEngine(createFixture())
  const collection = engine.getVehicleCatalog({ collection: "sport-prestige" })
  assert.deepEqual(collection.vehicles.map((vehicle) => vehicle.id), ["bmw-m3-2015"])
  assert.match(collection.heading.title, /Sport/)
  assert.equal(collection.seo.noIndex, false)
  assert.equal(engine.getVehicleCatalog({ collection: "inconnue" }).resultCount, 3)
})

test("catalogue cumule marque, carburant et boîte", () => {
  const catalog = createLiveEngine(createFixture()).getVehicleCatalog({
    brand: "BMW",
    fuel: "Essence",
    gearbox: "Automatique",
  })
  assert.deepEqual(catalog.vehicles.map((vehicle) => vehicle.id), ["bmw-m3-2015"])
  assert.equal(catalog.activeFilters.length, 3)
  assert.equal(catalog.seo.noIndex, true)
})

test("catalogue applique les bornes de prix et ignore une borne incohérente", () => {
  const engine = createLiveEngine(createFixture())
  assert.deepEqual(
    engine.getVehicleCatalog({ minPrice: 20000, maxPrice: 30000 }).vehicles.map((vehicle) => vehicle.id),
    ["peugeot-308-gt-line"]
  )
  assert.equal(engine.getVehicleCatalog({ minPrice: 50000, maxPrice: 20000 }).resultCount, 1)
})

test("catalogue prépare tous les tris déterministes", () => {
  const engine = createLiveEngine(createFixture())
  assert.equal(engine.getVehicleCatalog().vehicles[0].id, "bmw-m3-2015")
  assert.equal(engine.getVehicleCatalog({ sort: "price-asc" }).vehicles[0].id, "renault-clio-rs-line")
  assert.equal(engine.getVehicleCatalog({ sort: "price-desc" }).vehicles[0].id, "bmw-m3-2015")
  assert.equal(engine.getVehicleCatalog({ sort: "newest" }).vehicles[0].id, "peugeot-308-gt-line")
  assert.equal(engine.getVehicleCatalog({ sort: "mileage-asc" }).vehicles[0].id, "renault-clio-rs-line")
})

test("catalogue prépare les options dédupliquées et leurs compteurs globaux", () => {
  const data = createFixture()
  data.vehicles = [...data.vehicles, { ...structuredClone(data.vehicles[0]), id: "bmw-2", slug: "bmw-2" }]
  const filters = createLiveEngine(data).getVehicleCatalog({ fuel: "Diesel" }).filters
  assert.deepEqual(filters.brands.find((option) => option.value === "BMW"), {
    value: "BMW",
    label: "BMW",
    count: 2,
  })
  assert.equal(filters.fuels.filter((option) => option.value === "Essence").length, 1)
})

test("catalogue prépare les URLs de retrait et la remise à zéro", () => {
  const catalog = createLiveEngine(createFixture()).getVehicleCatalog({ brand: "BMW", fuel: "Essence" })
  assert.equal(catalog.activeFilters.find((filter) => filter.id === "brand")?.removeHref, "/vehicles?fuel=Essence")
  assert.equal(catalog.filters.resetHref, "/vehicles")
})

test("catalogue pagine et rabat une page trop élevée sur la dernière", () => {
  const data = createFixture()
  const base = data.vehicles[0]
  data.vehicles = Array.from({ length: 13 }, (_, index) => ({
    ...structuredClone(base),
    id: `vehicle-${index}`,
    slug: `vehicle-${index}`,
  }))
  const catalog = createLiveEngine(data).getVehicleCatalog({ page: 99 })
  assert.equal(catalog.pagination.page, 2)
  assert.equal(catalog.pagination.totalPages, 2)
  assert.equal(catalog.vehicles.length, 1)
  assert.ok(catalog.pagination.previousHref)
})

test("catalogue prépare un état vide et le SEO de base", () => {
  const engine = createLiveEngine(createFixture())
  assert.equal(engine.getVehicleCatalog().seo.noIndex, false)
  const empty = engine.getVehicleCatalog({ minPrice: 100000 })
  assert.equal(empty.resultCount, 0)
  assert.match(empty.emptyState?.title ?? "", /Aucun véhicule/)
})

test("catalogue ne mute aucune donnée source", () => {
  const data = createFixture()
  const before = structuredClone(data)
  createLiveEngine(data).getVehicleCatalog({ brand: "BMW", sort: "price-desc" })
  assert.deepEqual(data, before)
})
