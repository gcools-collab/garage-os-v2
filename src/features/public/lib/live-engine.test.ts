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
    vehicle?.displayImage?.url,
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
