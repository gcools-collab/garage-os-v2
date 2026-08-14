import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import { getLiveThemeDefinition } from "@/features/theme"
import {
  PremiumVehicleDetailPage,
  VEHICLE_DETAIL_BREAKPOINTS,
  VehicleCTASectionBuilder,
  VehicleDetailPageBuilder,
  VehicleHeroBuilder,
  VehicleSEOBuilder,
  VehicleSpecificationBuilder,
  VehicleTrustBuilder,
  buildVehicleMedia,
  getVehicleHeroImageSizes,
} from ".."
import { buildGaragePublicViewModel } from "../../builders"

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
    socialLinks: { facebookUrl: null, instagramUrl: null },
    themeKey: "default",
    colors: { primary: null, secondary: null, accent: null },
  },
  liveTheme: getLiveThemeDefinition("default"),
}

function vehicle(overrides: Partial<LiveStockVehicle> = {}): LiveStockVehicle {
  return {
    id: "vehicle-1",
    garageId: garage.garageId,
    slug: "bmw-m3-competition-2020",
    make: "BMW",
    model: "M3",
    version: "Competition",
    title: "BMW M3 Competition",
    year: 2020,
    mileageKm: 45_000,
    fuelType: "Essence",
    transmission: "Automatique",
    bodyType: "Berline",
    powerHp: 510,
    fiscalPower: 42,
    doors: 4,
    seats: 5,
    color: "Noir",
    registrationDate: "2020-06-01",
    priceCents: 7_000_000,
    previousPriceCents: null,
    description: "Première main.\nEntretien suivi dans le réseau.",
    equipment: [
      "Climatisation automatique",
      "Airbags",
      "Apple CarPlay",
      "Caméra de recul",
      "Jantes 19 pouces",
      "Sellerie cuir",
    ],
    status: "PUBLISHED",
    publicationStatus: "PUBLISHED",
    publishedAt: "2026-07-20T10:00:00.000Z",
    soldAt: null,
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-07-30T10:00:00.000Z",
    co2Emissions: 220,
    critAir: 1,
    euroStandard: "Euro 6",
    ownersCount: 1,
    photos: [{
      id: "photo-1",
      path: "garage-1/vehicle-1/photo.jpg",
      url: "/photo.jpg",
      alt: "BMW M3 noire",
      position: 0,
      isCover: true,
      width: 1600,
      height: 1200,
    }],
    ...overrides,
  }
}

test("VehicleHeroBuilder prépare cover, prix, identité et métadonnées", () => {
  const source = vehicle()
  const media = buildVehicleMedia(source)
  const hero = new VehicleHeroBuilder().build(
    source,
    buildGaragePublicViewModel(garage),
    media.domain
  )
  assert.equal(hero.title, "BMW M3")
  assert.equal(hero.version, "Competition")
  assert.equal(hero.price, "70 000 €")
  assert.equal(hero.cover?.alt, "BMW M3 noire")
  assert.deepEqual(hero.metadata.map((item) => item.label), [
    "Année", "Kilométrage", "Énergie", "Boîte",
  ])
})

test("les caractéristiques masquent les absences et n’exposent jamais le VIN", () => {
  const specifications = new VehicleSpecificationBuilder().build(
    vehicle({ color: null, co2Emissions: null })
  )
  assert.equal(specifications.some((item) => item.label === "Couleur"), false)
  assert.equal(specifications.some((item) => item.label.includes("VIN")), false)
  assert.equal(specifications.some((item) => item.label === "Puissance DIN"), true)
})

test("le CTA prépare les trois parcours commerciaux", () => {
  const cta = new VehicleCTASectionBuilder().build(
    buildGaragePublicViewModel(garage),
    "BMW M3",
    "bmw-m3-competition-2020",
  )
  assert.match(cta.primary.href, /contact\?vehicle=bmw-m3-competition-2020/)
  assert.match(cta.secondary?.href ?? "", /project=test-drive/)
  assert.match(cta.tertiary?.href ?? "", /project=trade-in/)
})

test("le résumé commercial et les équipements sont déterministes", () => {
  const detail = new VehicleDetailPageBuilder().build({
    garage,
    vehicle: vehicle(),
  })
  assert.ok(detail.commercialSummary.includes("Première main"))
  assert.ok(detail.commercialSummary.includes("Faible kilométrage"))
  assert.deepEqual(detail.equipmentGroups.map((group) => group.title), [
    "Confort", "Sécurité", "Multimédia", "Aides à la conduite", "Extérieur", "Intérieur",
  ])
})

test("les groupes d’équipements vides sont masqués", () => {
  const detail = new VehicleDetailPageBuilder().build({
    garage,
    vehicle: vehicle({ equipment: ["Apple CarPlay"] }),
  })
  assert.deepEqual(detail.equipmentGroups.map((group) => group.title), ["Multimédia"])
})

test("la confiance utilise uniquement les données publiques disponibles", () => {
  const trust = new VehicleTrustBuilder().build(
    vehicle(),
    buildGaragePublicViewModel(garage)
  )
  assert.ok(trust.items.some((item) => item.id === "professional"))
  assert.ok(trust.items.some((item) => item.id === "history"))
  assert.equal(JSON.stringify(trust).includes("VIN"), false)
})

test("le fallback sans photo passe exclusivement par Media Platform", () => {
  const detail = new VehicleDetailPageBuilder().build({
    garage,
    vehicle: vehicle({ photos: [] }),
  })
  assert.equal(detail.gallery.empty, true)
  assert.equal(detail.hero.cover, null)
})

test("VehicleSEOBuilder prépare canonical et tous les JSON-LD", () => {
  const source = vehicle()
  const media = buildVehicleMedia(source)
  const seo = new VehicleSEOBuilder().build({
    vehicle: source,
    garage: buildGaragePublicViewModel(garage),
    media: media.domain,
  })
  assert.equal(seo.canonicalPath, "/g/garage-martin/vehicules/bmw-m3-competition-2020")
  assert.equal(seo.vehicleJsonLd["@type"], "Vehicle")
  assert.equal(seo.breadcrumbJsonLd["@type"], "BreadcrumbList")
  assert.equal(seo.imageJsonLd?.structuredImage["@type"], "ImageObject")
  assert.deepEqual(seo.localBusinessJsonLd["@type"], ["AutoDealer", "LocalBusiness"])
})

test("la page respecte l’ordre commercial et rend le CTA mobile sticky", () => {
  const html = renderToStaticMarkup(
    <PremiumVehicleDetailPage detail={new VehicleDetailPageBuilder().build({
      garage,
      vehicle: vehicle(),
    })} />
  )
  assert.ok(html.indexOf("Galerie immersive") < html.indexOf("L’essentiel"))
  assert.ok(html.indexOf("L’essentiel") < html.indexOf("Caractéristiques"))
  assert.match(html, /fixed inset-x-0 bottom-0/)
  assert.equal((html.match(/<h1/g) ?? []).length, 1)
})

test("les helpers responsive couvrent mobile et desktop", () => {
  assert.equal(getVehicleHeroImageSizes(), "(max-width: 1023px) 100vw, 58vw")
  assert.equal(VEHICLE_DETAIL_BREAKPOINTS.desktopSidebarMinWidth, 1024)
  assert.equal(VEHICLE_DETAIL_BREAKPOINTS.mobileStickyCtaMaxWidth, 1023)
})

test("les contrats futurs restent présents mais désactivés", () => {
  const detail = new VehicleDetailPageBuilder().build({
    garage,
    vehicle: vehicle(),
  })
  assert.equal(detail.futureModules.length, 9)
  assert.equal(detail.futureModules.every((module) => module.enabled === false), true)
  assert.equal(detail.galleryCapabilities.threeSixty, "PLACEHOLDER")
  assert.equal(detail.galleryCapabilities.video, "PLACEHOLDER")
  assert.equal(detail.galleryCapabilities.navigation, "CONTRACT")
  assert.equal(detail.galleryCapabilities.fullscreen, "CONTRACT")
})
