import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import { resolveLiveTheme } from "@/features/theme"
import {
  LeboncoinProvider,
  PartnerApiProvider,
  PublicationTargetBuilder,
  PublicationTargetEngine,
  PublicationTargetRegistry,
  PublicWebsiteProvider,
  TargetCard,
} from "../index"

function garage(): PublicGarageContext {
  return {
    garageId: "garage-1", garageSlug: "garage-martin", displayName: "Garage Martin",
    status: "ACTIVE", basePath: "/g/garage-martin",
    liveTheme: resolveLiveTheme({ themeKey: "default" }),
    branding: {
      displayName: "Garage Martin", legalName: null, logoUrl: null, faviconUrl: null,
      phone: "0327000000", formattedPhone: "03 27 00 00 00", email: "contact@example.com",
      formattedAddress: "Valenciennes", shortDescription: "Garage automobile",
      socialLinks: { facebookUrl: null, instagramUrl: null }, themeKey: "default",
      colors: { primary: null, secondary: null, accent: null },
    },
  }
}

function vehicle(overrides: Partial<LiveStockVehicle> = {}): LiveStockVehicle {
  return {
    id: "vehicle-1", garageId: "garage-1", slug: "bmw-m3-2015", make: "BMW", model: "M3",
    version: "Competition", title: "BMW M3 Competition", year: 2015, mileageKm: 63_000,
    fuelType: "Essence", transmission: "Automatique", bodyType: "Berline", stockCategory: null, powerHp: 450,
    fiscalPower: 34, doors: 4, seats: 5, color: "Bleu", registrationDate: "2015-05-10",
    priceCents: 6_799_000, previousPriceCents: null,
    description: "BMW M3 Competition entretenue et disponible immédiatement.", equipment: ["Navigation"],
    status: "READY_TO_PUBLISH", publicationStatus: "DRAFT", publishedAt: null, soldAt: null,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
    co2Emissions: 194, critAir: 1, euroStandard: "Euro 6", ownersCount: 1,
    photos: [{
      id: "photo-1", path: "garage-1/vehicle-1/photo.jpg", url: "/photo.jpg",
      alt: "BMW M3", position: 0, isCover: true, width: 1600, height: 900,
    }],
    ...overrides,
  }
}

function context(overrides: Partial<LiveStockVehicle> = {}) {
  return { source: { garage: garage(), vehicle: vehicle(overrides), garageActive: true, brandingConfigured: true } } as const
}

test("PublicWebsiteProvider réutilise la fiche publique pour la preview", async () => {
  const provider = new PublicWebsiteProvider()
  const preview = await provider.preview(context())
  assert.equal(preview.targetName, "Site public")
  assert.equal(preview.simulatedUrl, "/g/garage-martin/vehicules/bmw-m3-2015")
  assert.equal(preview.cover?.url, "/photo.jpg")
  assert.match(preview.title, /BMW M3 Competition/)
})

test("le provider public valide slug, cover, médias, description, prix et identité", async () => {
  const provider = new PublicWebsiteProvider()
  const valid = await provider.validate(context())
  assert.equal(valid.every((item) => item.state === "PASS"), true)
  const invalid = await provider.validate(context({ slug: "", photos: [], description: null, priceCents: null }))
  assert.deepEqual(
    invalid.filter((item) => item.state === "BLOCKER").map((item) => item.id),
    ["slug", "cover", "media", "description", "price"]
  )
})

test("les capabilities sont explicites et testables", () => {
  const website = new PublicWebsiteProvider()
  const partner = new PartnerApiProvider()
  assert.equal(website.supports("SEO"), true)
  assert.equal(website.supports("VIDEO"), false)
  assert.equal(partner.supports("360"), true)
})

test("les providers préparés retournent Not implemented sans réseau", async () => {
  const provider = new LeboncoinProvider()
  assert.equal((await provider.health()), "UNKNOWN")
  assert.equal((await provider.publish(context())).code, "NOT_IMPLEMENTED")
  assert.equal((await provider.validate(context()))[0]?.state, "BLOCKER")
})

test("le registre sélectionne les providers sans dépendance aux plateformes", () => {
  const registry = new PublicationTargetRegistry()
  assert.equal(registry.list().length, 6)
  assert.deepEqual(registry.select(["PUBLIC_WEBSITE", "INSTAGRAM"]).map((provider) => provider.target.id), ["PUBLIC_WEBSITE", "INSTAGRAM"])
})

test("PublicationTargetEngine sélectionne, valide et agrège les targets", async () => {
  const providers = new PublicationTargetRegistry().list()
  const result = await new PublicationTargetEngine(providers).analyze({
    context: context(),
    targetIds: ["PUBLIC_WEBSITE", "LEBONCOIN"],
    requiredCapabilities: ["PHOTOS", "PRICE"],
  })
  assert.equal(result.analyses.length, 2)
  assert.equal(result.publishableCount, 1)
  assert.equal(result.healthyCount, 1)
  assert.equal(result.blockerCount, 1)
})

test("le moteur bloque une target lorsqu'une capability requise manque", async () => {
  const result = await new PublicationTargetEngine([new PublicWebsiteProvider()]).analyze({
    context: context(),
    requiredCapabilities: ["VIDEO"],
  })
  assert.equal(result.analyses[0]?.canPublish, false)
  assert.deepEqual(result.analyses[0]?.missingCapabilities, ["VIDEO"])
})

test("le moteur agrège une exécution Site public et les providers encore préparés", async () => {
  const result = await new PublicationTargetEngine([new PublicWebsiteProvider(), new LeboncoinProvider()]).execute({
    operation: "UPDATE",
    context: context(),
    targetIds: ["PUBLIC_WEBSITE", "LEBONCOIN"],
  })
  assert.equal(result.length, 2)
  assert.equal(result.every((item) => item.operation === "UPDATE"), true)
  assert.equal(result.find((item) => item.targetId === "PUBLIC_WEBSITE")?.code, "SUCCESS")
  assert.equal(result.find((item) => item.targetId === "LEBONCOIN")?.code, "NOT_IMPLEMENTED")
})

test("le builder prépare uniquement des données de présentation", async () => {
  const result = await new PublicationTargetEngine([new PublicWebsiteProvider()]).analyze({ context: context() })
  const viewModel = new PublicationTargetBuilder().build(result)
  assert.equal(viewModel.publishableCount, 1)
  assert.match(viewModel.summary, /1 destination prête/)
  assert.equal(viewModel.targets[0]?.capabilities.length, 10)
  assert.equal(viewModel.targets[0]?.healthLabel, "Disponible")
})

test("TargetCard rend statut, santé, preview, validations et capabilities", async () => {
  const result = await new PublicationTargetEngine([new PublicWebsiteProvider()]).analyze({ context: context() })
  const target = new PublicationTargetBuilder().build(result).targets[0]
  assert.ok(target)
  const html = renderToStaticMarkup(<TargetCard target={target} />)
  assert.match(html, /Site public/)
  assert.match(html, /Disponible/)
  assert.match(html, /BMW M3 Competition/)
  assert.match(html, /Capacités de diffusion/)
  assert.match(html, /Validation Site public/)
})
