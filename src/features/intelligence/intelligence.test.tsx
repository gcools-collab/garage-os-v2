import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { GarageIntelligenceDashboard } from "./components/GarageIntelligenceDashboard"
import { buildGarageIntelligenceBrief, buildGarageIntelligenceSnapshot, garageIntelligenceFixture } from "./engine"
import {
  buildGarageDashboard,
  buildGarageDashboardFromBrief,
  emptyGarageIntelligenceData,
  mapBriefToGarageIntelligenceData,
} from "./presentation"
import { defaultGarageIntelligenceConfig } from "./config"

const context = { garageName: "Garage Martin" }

test("construit un ViewModel déterministe sans muter les données garage", () => {
  const data = structuredClone(garageIntelligenceFixture)
  const before = structuredClone(data)

  const first = buildGarageDashboard({ data, context })
  const second = buildGarageDashboard({ data, context })

  assert.deepEqual(first, second)
  assert.deepEqual(data, before)
})

test("prépare toutes les valeurs métier avant le rendu", () => {
  const dashboard = buildGarageDashboard({
    data: garageIntelligenceFixture,
    context,
  })

  assert.equal(dashboard.summary.title, "Aujourd’hui chez Garage Martin")
  assert.deepEqual(dashboard.kpis.map((kpi) => kpi.id), [
    "stock",
    "stock-value",
    "invested-capital",
    "potential-margin",
    "rotation",
  ])
  assert.match(dashboard.kpis.find((kpi) => kpi.id === "stock-value")?.value ?? "", /84[\s\u202f]990/)
  assert.ok(dashboard.priorities.length > 0)
  assert.ok(dashboard.alerts.length > 0)
  assert.equal(dashboard.recommendations.length, 3)
  assert.equal(dashboard.timeline[0]?.id, "activity-photo")
})

test("n'expose aucun véhicule ou MarketAnalysis brut dans le ViewModel", () => {
  const serialized = JSON.stringify(
    buildGarageDashboard({ data: garageIntelligenceFixture, context })
  )

  assert.equal(serialized.includes('"purchasePrice"'), false)
  assert.equal(serialized.includes('"sellingPrice"'), false)
  assert.equal(serialized.includes('"analyzedAt"'), false)
  assert.equal(serialized.includes('"marketAnalyses"'), false)
})

test("rend le dashboard depuis le seul ViewModel avec un unique h1", () => {
  const html = renderToStaticMarkup(
    <GarageIntelligenceDashboard
      dashboard={buildGarageDashboard({ data: garageIntelligenceFixture, context })}
    />
  )

  assert.equal((html.match(/<h1/g) ?? []).length, 1)
  assert.match(html, /Actions prioritaires/)
  assert.match(html, /Alertes/)
  assert.match(html, /Recommandations IA/)
  assert.match(html, /Dernières activités/)
})

test("injecte le garage actif sans modifier les fixtures métier", () => {
  const dashboard = buildGarageDashboard({
    data: garageIntelligenceFixture,
    context: { garageName: "S.A.P" },
  })

  assert.equal(dashboard.summary.title, "Aujourd’hui chez S.A.P")
  assert.equal(dashboard.kpis.find((kpi) => kpi.id === "stock")?.value, "3")
})

test("construit le dashboard depuis un brief réel sans fixture par défaut", () => {
  const now = new Date("2026-08-28T09:00:00.000Z")
  const brief = buildGarageIntelligenceBrief({
    snapshot: buildGarageIntelligenceSnapshot({
      garage: { id: "g-sap", name: "S.A.P", timezone: "Europe/Paris" },
      source: {
        vehicles: [
          {
            id: "v1",
            garage_id: "g-sap",
            live_slug: "bmw-320",
            brand: "BMW",
            model: "320d",
            trim: null,
            version: null,
            status: "PUBLISHED",
            publication_status: "PUBLISHED",
            selling_price: 24990,
            purchase_price: 21000,
            description: "Description complète",
            year: 2019,
            mileage: 82000,
            fuel: "Diesel",
            gearbox: "Automatique",
            vin: "VF123",
            registration_number: "AB-123-CD",
            created_at: "2026-06-01T10:00:00.000Z",
            updated_at: "2026-08-20T10:00:00.000Z",
            published_at: "2026-06-10T10:00:00.000Z",
          },
        ],
        costs: [{ vehicle_id: "v1", amount: 500 }],
        images: [{ vehicle_id: "v1", type: "PHOTO" }],
        marketAnalyses: [],
        leads: [],
        tasks: [],
        recommendations: [],
      },
      now,
    }),
    config: defaultGarageIntelligenceConfig,
    now,
    locale: "fr-FR",
    timezone: "Europe/Paris",
  })

  const dashboard = buildGarageDashboardFromBrief(brief, { garageName: "S.A.P" }, now)

  assert.equal(dashboard.kpis.find((kpi) => kpi.id === "stock")?.value, "1")
  assert.doesNotMatch(JSON.stringify(dashboard), /BMW M3 Competition/)
  assert.doesNotMatch(JSON.stringify(dashboard), /Jaguar Type E/)
})

test("expose un état vide véridique quand le garage n'a aucun véhicule", () => {
  const now = new Date("2026-08-28T09:00:00.000Z")
  const dashboard = buildGarageDashboard({
    data: emptyGarageIntelligenceData(now),
    context: { garageName: "Garage vide" },
  })

  assert.equal(dashboard.kpis.find((kpi) => kpi.id === "stock")?.value, "0")
  assert.equal(dashboard.priorities.length, 0)
  assert.equal(dashboard.timeline.length, 0)
})

test("mapBriefToGarageIntelligenceData ne contient pas les fixtures historiques", () => {
  const now = new Date("2026-08-28T09:00:00.000Z")
  const brief = buildGarageIntelligenceBrief({
    snapshot: buildGarageIntelligenceSnapshot({
      garage: { id: "g-sap", name: "S.A.P", timezone: "Europe/Paris" },
      source: {
        vehicles: [],
        costs: [],
        images: [],
        marketAnalyses: [],
        leads: [],
        tasks: [],
        recommendations: [],
      },
      now,
    }),
    config: defaultGarageIntelligenceConfig,
    now,
    locale: "fr-FR",
    timezone: "Europe/Paris",
  })

  const data = mapBriefToGarageIntelligenceData(brief, { now })

  assert.equal(data.stock.length, 0)
  assert.equal(data.activities.length, 0)
  assert.doesNotMatch(JSON.stringify(data), /peugeot-208/)
})
