import assert from "node:assert/strict"
import test from "node:test"
import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import { getLiveThemeDefinition } from "@/features/theme"
import {
  buildGaragePublicViewModel,
  buildPublicContact,
  buildPublicHomepage,
  buildPublicSeo,
  buildPublicStock,
  buildPublicVehicleSlug,
  buildVehiclePublicCard,
  buildVehiclePublicSeo,
} from "../builders"
import { getPublicVehicleImageSizes } from "../presentation"
import { loadPublicSiteRecord } from "../repositories/public-site-source"

const garage: PublicGarageContext = {
  garageId: "garage-1",
  garageSlug: "garage-martin",
  displayName: "Garage Martin",
  status: "ACTIVE",
  basePath: "/g/garage-martin",
  branding: {
    displayName: "Garage Martin",
    legalName: "Garage Martin SAS",
    logoUrl: "https://images.example/logo.png",
    faviconUrl: null,
    phone: "03 27 00 00 00",
    formattedPhone: "03 27 00 00 00",
    email: "contact@garage.test",
    formattedAddress: "10 rue de Paris, 59590 Raismes",
    shortDescription: "Automobiles sélectionnées avec exigence.",
    socialLinks: { facebookUrl: null, instagramUrl: "https://instagram.com/garage" },
    themeKey: "default",
    colors: { primary: null, secondary: null, accent: null },
  },
  liveTheme: getLiveThemeDefinition("default"),
}

function vehicle(id: string, overrides: Partial<LiveStockVehicle> = {}): LiveStockVehicle {
  return {
    id, garageId: garage.garageId, slug: `bmw-m3-${id}`, make: "BMW", model: "M3",
    version: "Competition", title: "BMW M3 Competition", year: 2020,
    mileageKm: 45_000, fuelType: "Essence", transmission: "Automatique",
    bodyType: "Berline", powerHp: 510, fiscalPower: 42, doors: 4, seats: 5,
    color: "Noir", registrationDate: "2020-06-01", priceCents: 7_000_000,
    previousPriceCents: null, description: "Très belle BMW M3.", equipment: [],
    status: "PUBLISHED", publicationStatus: "PUBLISHED",
    publishedAt: "2026-07-20T10:00:00.000Z", soldAt: null,
    createdAt: "2026-07-20T10:00:00.000Z", updatedAt: "2026-07-20T10:00:00.000Z",
    co2Emissions: 220, critAir: 1, euroStandard: "Euro 6", ownersCount: 1,
    photos: [{
      id: `photo-${id}`, path: `garage/${id}.jpg`,
      url: `https://images.example/${id}.jpg`, alt: "BMW M3",
      position: 0, isCover: true, width: 1600, height: 1200,
    }],
    ...overrides,
  }
}

test("le builder garage prépare branding, navigation et coordonnées", () => {
  const view = buildGaragePublicViewModel(garage)
  assert.equal(view.name, "Garage Martin")
  assert.equal(view.address, "10 rue de Paris, 59590 Raismes")
  assert.equal(view.navigation[0].href, "/g/garage-martin/stock")
  assert.equal(view.socialLinks.length, 1)
  assert.equal(view.phone, "03 27 00 00 00")
  assert.equal(view.phoneHref, "tel:0327000000")
})

test("la homepage prépare toutes les sections sans entité brute", () => {
  const homepage = buildPublicHomepage(garage, [vehicle("1"), vehicle("2")])
  assert.equal(homepage.hero.title, "Votre prochain véhicule commence ici")
  assert.equal(homepage.featuredVehicles.length, 2)
  assert.equal(homepage.sections.find((item) => item.id === "REVIEWS")?.enabled, false)
  assert.equal("priceCents" in homepage.featuredVehicles[0], false)
})

test("la carte véhicule prépare slug, image, prix et capacités futures", () => {
  const card = buildVehiclePublicCard(vehicle("1", { hasExterior360: true, hasInteriorTour: true }), buildGaragePublicViewModel(garage))
  assert.equal(card.href, "/g/garage-martin/vehicules/bmw-m3-1")
  assert.equal(card.price, "70 000 €")
  assert.equal(card.image?.alt, "BMW M3")
  assert.deepEqual(card.futureCapabilities, ["360", "VIRTUAL_TOUR", "COMPARE", "FAVORITE"])
  assert.ok(card.badges.includes("360°"))
  assert.ok(card.badges.includes("Visite virtuelle"))
})

test("le stock filtre, trie et pagine de manière déterministe", () => {
  const stock = buildPublicStock(garage, [
    vehicle("1"),
    vehicle("2", { make: "Audi", model: "A3", priceCents: 2_500_000 }),
  ], { brand: "Audi", sort: "price-asc", page: 1 })
  assert.equal(stock.vehicles.length, 1)
  assert.equal(stock.vehicles[0].name, "Audi A3")
  assert.equal(stock.resultLabel, "1 véhicule")
})

test("le contact est dérivé uniquement du branding", () => {
  const contact = buildPublicContact(garage)
  assert.equal(contact.phoneHref, "tel:0327000000")
  assert.equal(contact.form.fields.length, 4)
})

test("le builder SEO prépare canonical et schema.org AutoDealer", () => {
  const publicGarage = buildGaragePublicViewModel(garage)
  const seo = buildPublicSeo({
    garage: publicGarage,
    pageTitle: "Stock",
    canonicalPath: "/g/garage-martin/stock",
  })
  assert.equal(seo.title, "Stock | Garage Martin")
  assert.deepEqual(seo.structuredData["@type"], ["AutoDealer", "LocalBusiness", "Organization"])
})

test("le SEO véhicule prépare le contrat schema.org Vehicle", () => {
  const publicGarage = buildGaragePublicViewModel(garage)
  const card = buildVehiclePublicCard(vehicle("1"), publicGarage)
  const seo = buildVehiclePublicSeo({ garage: publicGarage, vehicle: card })
  assert.equal(seo.structuredData["@type"], "Vehicle")
  assert.equal(seo.canonicalPath, "/g/garage-martin/vehicules/bmw-m3-1")
})

test("les slugs sont stables, sans accents et jamais calculés dans React", () => {
  assert.equal(buildPublicVehicleSlug({
    make: "Citroën", model: "C5 Aircross", year: 2022, id: "84562abcdef",
  }), "citroen-c5-aircross-2022-84562")
})

test("le helper responsive prépare mobile, tablette et desktop", () => {
  assert.equal(getPublicVehicleImageSizes(), "(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw")
})

test("le repository résout le garage avant de lire son stock", async () => {
  const calls: string[] = []
  const record = await loadPublicSiteRecord("garage-martin", {
    async resolveGarage(slug) {
      calls.push(`garage:${slug}`)
      return garage
    },
    async getVehicles(resolvedGarage) {
      calls.push(`stock:${resolvedGarage.garageId}`)
      return [vehicle("1")]
    },
  })
  assert.deepEqual(calls, ["garage:garage-martin", "stock:garage-1"])
  assert.equal(record?.vehicles.length, 1)
})

test("le repository ne lit pas le stock d’un garage introuvable", async () => {
  let stockRead = false
  const record = await loadPublicSiteRecord("inconnu", {
    async resolveGarage() { return null },
    async getVehicles() {
      stockRead = true
      return []
    },
  })
  assert.equal(record, null)
  assert.equal(stockRead, false)
})

test("un garage désactivé est traité comme absent par la projection publique", async () => {
  let stockRead = false
  const record = await loadPublicSiteRecord("garage-desactive", {
    async resolveGarage() { return null },
    async getVehicles() { stockRead = true; return [] },
  })
  assert.equal(record, null)
  assert.equal(stockRead, false)
})

test("un garage live reste disponible avec une configuration de services vide", async () => {
  const withoutServices = { ...garage, serviceConfigurations: [] }
  const record = await loadPublicSiteRecord("garage-martin", {
    async resolveGarage() { return withoutServices },
    async getVehicles() { return [] },
  })
  assert.equal(record?.garage.garageId, garage.garageId)
  assert.deepEqual(record?.garage.serviceConfigurations, [])
})
