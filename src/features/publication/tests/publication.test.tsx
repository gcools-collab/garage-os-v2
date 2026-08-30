import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import { resolveLiveTheme } from "@/features/theme"
import {
  getPublicationTransitions,
  isPublicationTransitionAllowed,
  PublicationChecklistBuilder,
  PublicationReadinessEngine,
  PublicationValidationEngine,
  PublicationWorkspace,
  PublicationWorkspaceBuilder,
} from "../index"

function garage(): PublicGarageContext {
  return {
    garageId: "garage-1",
    garageSlug: "garage-martin",
    displayName: "Garage Martin",
    status: "ACTIVE",
    basePath: "/g/garage-martin",
    liveTheme: resolveLiveTheme({ themeKey: "default" }),
    branding: {
      displayName: "Garage Martin",
      legalName: "Garage Martin SARL",
      logoUrl: null,
      faviconUrl: null,
      phone: "0327000000",
      formattedPhone: "03 27 00 00 00",
      email: "contact@example.com",
      formattedAddress: "1 rue du Garage, 59300 Valenciennes",
      shortDescription: "Véhicules sélectionnés.",
      socialLinks: { facebookUrl: null, instagramUrl: null },
      themeKey: "default",
      colors: { primary: null, secondary: null, accent: null },
    },
  }
}

function vehicle(overrides: Partial<LiveStockVehicle> = {}): LiveStockVehicle {
  return {
    id: "vehicle-1",
    garageId: "garage-1",
    slug: "bmw-m3-2015",
    make: "BMW",
    model: "M3",
    version: "Competition",
    title: "BMW M3 Competition",
    year: 2015,
    mileageKm: 63_000,
    fuelType: "Essence",
    transmission: "Automatique",
    bodyType: "Berline",
    stockCategory: null,
    powerHp: 450,
    fiscalPower: 34,
    doors: 4,
    seats: 5,
    color: "Bleu",
    registrationDate: "2015-05-10",
    priceCents: 6_799_000,
    previousPriceCents: null,
    description: "Une BMW M3 Competition entretenue avec soin, disponible immédiatement et présentée avec son historique complet.",
    equipment: ["Climatisation", "Navigation", "Caméra"],
    status: "READY_TO_PUBLISH",
    publicationStatus: "DRAFT",
    publishedAt: null,
    soldAt: null,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
    co2Emissions: 194,
    critAir: 1,
    euroStandard: "Euro 6",
    ownersCount: 1,
    photos: [0, 1, 2].map((position) => ({
      id: `photo-${position}`,
      path: `garage-1/vehicle-1/photo-${position}.jpg`,
      url: `/photo-${position}.jpg`,
      alt: `BMW M3 photo ${position + 1}`,
      position,
      isCover: position === 0,
      width: 1600,
      height: 900,
    })),
    ...overrides,
  }
}

function source(overrides: Partial<LiveStockVehicle> = {}) {
  return {
    garage: garage(),
    vehicle: vehicle(overrides),
    garageActive: true,
    brandingConfigured: true,
  } as const
}

test("le Readiness Engine agrège PASS, WARNING, BLOCKER et NOT_APPLICABLE", () => {
  const readiness = new PublicationReadinessEngine().calculate([
    { id: "1", title: "A", description: "", state: "PASS", severity: "SUCCESS", suggestedAction: null, href: null, order: 1 },
    { id: "2", title: "B", description: "", state: "WARNING", severity: "WARNING", suggestedAction: null, href: null, order: 2 },
    { id: "3", title: "C", description: "", state: "BLOCKER", severity: "CRITICAL", suggestedAction: null, href: null, order: 3 },
    { id: "4", title: "D", description: "", state: "NOT_APPLICABLE", severity: "INFORMATION", suggestedAction: null, href: null, order: 4 },
  ])
  assert.equal(readiness.score, 50)
  assert.equal(readiness.canPublish, false)
  assert.equal(readiness.applicableCount, 3)
})

test("les règles complètes rendent le véhicule publiable", () => {
  const results = new PublicationValidationEngine().validate(source())
  const readiness = new PublicationReadinessEngine().calculate(results)
  assert.equal(readiness.canPublish, true)
  assert.equal(readiness.blockers.length, 0)
  assert.equal(readiness.score, 100)
})

test("prix, cover, garage et identité produisent des blocages indépendants", () => {
  const input = source({ make: "", priceCents: null, photos: [] })
  const results = new PublicationValidationEngine().validate({
    ...input,
    garageActive: false,
  })
  const blockers = results.filter((item) => item.state === "BLOCKER").map((item) => item.id)
  assert.deepEqual(blockers, ["garage-active", "identity", "brand", "price", "cover"])
})

test("la checklist conserve l'ordre et prépare les actions suggérées", () => {
  const results = new PublicationValidationEngine().validate(source({ year: null }))
  const checklist = new PublicationChecklistBuilder().build(results)
  assert.equal(checklist[0]?.id, "garage-active")
  assert.equal(checklist.find((item) => item.id === "year")?.actionLabel, "Ajouter l’année")
  assert.equal(checklist.find((item) => item.id === "year")?.stateLabel, "À améliorer")
})

test("les transitions sont centralisées et refusent les raccourcis", () => {
  assert.equal(isPublicationTransitionAllowed("READY", "PUBLISHED"), true)
  assert.equal(isPublicationTransitionAllowed("DRAFT", "PUBLISHED"), false)
  assert.deepEqual(getPublicationTransitions("ARCHIVED"), [])
})

test("le Workspace Builder prépare score, preview publique et SEO", () => {
  const workspace = new PublicationWorkspaceBuilder().build(source())
  assert.equal(workspace.readiness.score, 100)
  assert.equal(workspace.workflow.status, "READY")
  assert.equal(workspace.publicPreview.vehicleTitle, "BMW M3")
  assert.equal(workspace.publicPreview.publicUrl, "/g/garage-martin/vehicules/bmw-m3-2015")
  assert.match(workspace.seoPreview.title, /BMW M3 Competition/)
  assert.equal(workspace.seoPreview.slug, "bmw-m3-2015")
  assert.equal(workspace.seoPreview.openGraphImage, "/photo-0.jpg")
})

test("le builder sépare blocages et avertissements sans calcul React", () => {
  const workspace = new PublicationWorkspaceBuilder().build(source({
    priceCents: null,
    year: null,
  }))
  assert.equal(workspace.blockers.some((item) => item.id === "price"), true)
  assert.equal(workspace.warnings.some((item) => item.id === "year"), true)
  assert.equal(workspace.actions.find((action) => action.type === "PUBLISH")?.enabled, false)
})

test("le composant rend le ViewModel, la progression et les sections accessibles", () => {
  const workspace = new PublicationWorkspaceBuilder().build(source())
  const html = renderToStaticMarkup(<PublicationWorkspace workspace={workspace} />)
  assert.equal((html.match(/<h1/g) ?? []).length, 1)
  assert.match(html, /Espace de publication/)
  assert.match(html, /role="progressbar"/)
  assert.match(html, /Checklist de publication/)
  assert.match(html, /Prévisualisation du site public/)
  assert.match(html, /Prévisualisation SEO/)
  assert.match(html, /aria-live="polite"/)
})
