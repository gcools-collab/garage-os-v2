import assert from "node:assert/strict"
import test from "node:test"

import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import { PublicationWorkspaceBuilder } from "@/features/publication"
import { PublicWebsiteProvider } from "@/features/publication-targets"
import { resolveLiveTheme } from "@/features/theme"
import {
  buildPublicationEventViewModel,
  PublicationExecutionEngine,
  PublicationLifecycleEngine,
} from "../index"
import type { PublicationExecutionRepository } from "../repositories"
import type { PublicationPersistenceCommand } from "../types"

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
    description: "BMW M3 Competition entretenue et disponible immédiatement.", equipment: [],
    status: "READY_TO_PUBLISH", publicationStatus: "DRAFT", publishedAt: null, soldAt: null,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
    co2Emissions: 194, critAir: 1, euroStandard: "Euro 6", ownersCount: 1,
    photos: [{
      id: "photo-1", path: "garage-1/vehicle-1/photo.jpg", url: "/photo.jpg",
      alt: "BMW M3", position: 0, isCover: true, width: 1600, height: 900,
    }, {
      id: "photo-2", path: "garage-1/vehicle-1/photo-2.jpg", url: "/photo-2.jpg",
      alt: "BMW M3", position: 1, isCover: false, width: 1600, height: 900,
    }, {
      id: "photo-3", path: "garage-1/vehicle-1/photo-3.jpg", url: "/photo-3.jpg",
      alt: "BMW M3", position: 2, isCover: false, width: 1600, height: 900,
    }],
    ...overrides,
  }
}

function source(overrides: Partial<LiveStockVehicle> = {}) {
  return { garage: garage(), vehicle: vehicle(overrides), garageActive: true, brandingConfigured: true } as const
}

class FakeRepository implements PublicationExecutionRepository {
  command: PublicationPersistenceCommand | null = null
  constructor(private readonly succeeds = true) {}
  async persist(command: PublicationPersistenceCommand) {
    this.command = command
    return this.succeeds
  }
}

const now = () => new Date("2026-07-31T10:00:00.000Z")

test("le lifecycle impose DRAFT vers READY vers PUBLISHED", () => {
  const lifecycle = new PublicationLifecycleEngine()
  assert.equal(lifecycle.resolve("DRAFT", "MARK_READY"), "READY")
  assert.equal(lifecycle.resolve("READY", "PUBLISH"), "PUBLISHED")
  assert.equal(lifecycle.resolve("DRAFT", "PUBLISH"), null)
  assert.equal(lifecycle.resolve("ARCHIVED", "PUBLISH"), null)
})

test("la publication exécute PublicWebsiteProvider puis persiste PUBLISHED", async () => {
  const repository = new FakeRepository()
  const result = await new PublicationExecutionEngine(new PublicWebsiteProvider(), repository, now)
    .execute({ source: source(), actorId: "user-1", action: "PUBLISH" })
  assert.equal(result.success, true)
  assert.equal(result.providerResult?.code, "SUCCESS")
  assert.equal(repository.command?.targetVehicleStatus, "PUBLISHED")
  assert.equal(repository.command?.publicationStatus, "PUBLISHED")
  assert.equal(repository.command?.publishedAt, "2026-07-31T10:00:00.000Z")
})

test("une transition invalide n'appelle ni provider ni repository", async () => {
  const repository = new FakeRepository()
  const result = await new PublicationExecutionEngine(new PublicWebsiteProvider(), repository, now)
    .execute({ source: source({ status: "PURCHASED" }), actorId: "user-1", action: "PUBLISH" })
  assert.equal(result.code, "INVALID_TRANSITION")
  assert.equal(repository.command, null)
})

test("la readiness bloque MARK_READY lorsque le dossier est incomplet", async () => {
  const repository = new FakeRepository()
  const result = await new PublicationExecutionEngine(new PublicWebsiteProvider(), repository, now)
    .execute({ source: source({ status: "PURCHASED", priceCents: null }), actorId: "user-1", action: "MARK_READY" })
  assert.equal(result.code, "VALIDATION_FAILED")
  assert.equal(repository.command, null)
})

test("les événements publiés sont structurés pour les consommateurs futurs", async () => {
  const repository = new FakeRepository()
  const result = await new PublicationExecutionEngine(new PublicWebsiteProvider(), repository, now)
    .execute({ source: source(), actorId: "user-1", action: "PUBLISH" })
  assert.equal(result.event?.type, "PUBLISHED")
  assert.equal(result.event?.actorId, "user-1")
  assert.equal(result.event?.metadata.provider, "PUBLIC_WEBSITE")
  assert.equal(result.event?.metadata.publicationEvent, "PUBLISHED")
})

test("réservation, vente et archivage génèrent les événements attendus", async () => {
  const cases = [
    { vehicle: { status: "PUBLISHED", publicationStatus: "PUBLISHED" } as const, action: "RESERVE" as const, event: "RESERVED" },
    { vehicle: { status: "RESERVED", publicationStatus: "PUBLISHED" } as const, action: "SELL" as const, event: "SOLD" },
    { vehicle: { status: "SOLD", publicationStatus: "UNPUBLISHED" } as const, action: "ARCHIVE" as const, event: "ARCHIVED" },
  ]
  for (const item of cases) {
    const result = await new PublicationExecutionEngine(new PublicWebsiteProvider(), new FakeRepository(), now)
      .execute({ source: source(item.vehicle), actorId: "user-1", action: item.action })
    assert.equal(result.event?.type, item.event)
  }
})

test("une dépublication conserve publishedAt et rend le catalogue privé", async () => {
  const repository = new FakeRepository()
  await new PublicationExecutionEngine(new PublicWebsiteProvider(), repository, now).execute({
    source: source({ status: "PUBLISHED", publicationStatus: "PUBLISHED", publishedAt: "2026-07-01T10:00:00.000Z" }),
    actorId: "user-1",
    action: "UNPUBLISH",
  })
  assert.equal(repository.command?.publicationStatus, "UNPUBLISHED")
  assert.equal(repository.command?.publishedAt, "2026-07-01T10:00:00.000Z")
  assert.equal(repository.command?.event.type, "UNPUBLISHED")
})

test("un échec de persistance retourne un résultat typé sans faux succès", async () => {
  const result = await new PublicationExecutionEngine(new PublicWebsiteProvider(), new FakeRepository(false), now)
    .execute({ source: source(), actorId: "user-1", action: "PUBLISH" })
  assert.equal(result.success, false)
  assert.equal(result.code, "PERSISTENCE_ERROR")
  assert.equal(result.event, null)
})

test("le builder d'événement prépare un ViewModel consommable", async () => {
  const result = await new PublicationExecutionEngine(new PublicWebsiteProvider(), new FakeRepository(), now)
    .execute({ source: source(), actorId: "user-1", action: "PUBLISH" })
  assert.ok(result.event)
  const viewModel = buildPublicationEventViewModel(result.event)
  assert.equal(viewModel.title, "PUBLISHED")
  assert.equal(viewModel.context.length, 4)
})

test("le Publication Workspace active uniquement l'action du statut courant", () => {
  const ready = new PublicationWorkspaceBuilder().build(source())
  assert.equal(ready.actions.find((action) => action.type === "PUBLISH")?.enabled, true)
  assert.equal(ready.actions.find((action) => action.type === "SELL")?.enabled, false)
  const published = new PublicationWorkspaceBuilder().build(source({ status: "PUBLISHED", publicationStatus: "PUBLISHED" }))
  assert.equal(published.actions.find((action) => action.type === "UNPUBLISH")?.enabled, true)
  assert.equal(published.actions.find((action) => action.type === "RESERVE")?.enabled, true)
})
