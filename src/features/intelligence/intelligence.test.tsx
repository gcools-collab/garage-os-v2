import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { GarageIntelligenceDashboard } from "./components"
import { garageIntelligenceFixture } from "./engine"
import { buildGarageDashboard } from "./presentation"

test("construit un ViewModel déterministe sans muter les données garage", () => {
  const data = structuredClone(garageIntelligenceFixture)
  const before = structuredClone(data)

  const context = { garageName: "Garage Martin" }
  const first = buildGarageDashboard({ data, context })
  const second = buildGarageDashboard({ data, context })

  assert.deepEqual(first, second)
  assert.deepEqual(data, before)
})

test("prépare toutes les valeurs métier avant le rendu", () => {
  const dashboard = buildGarageDashboard({ context: { garageName: "Garage Martin" } })

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
  const serialized = JSON.stringify(buildGarageDashboard({ context: { garageName: "Garage Martin" } }))

  assert.equal(serialized.includes('"purchasePrice"'), false)
  assert.equal(serialized.includes('"sellingPrice"'), false)
  assert.equal(serialized.includes('"analyzedAt"'), false)
  assert.equal(serialized.includes('"marketAnalyses"'), false)
})

test("rend le dashboard depuis le seul ViewModel avec un unique h1", () => {
  const html = renderToStaticMarkup(
    <GarageIntelligenceDashboard dashboard={buildGarageDashboard({ context: { garageName: "Garage Martin" } })} />
  )

  assert.equal((html.match(/<h1/g) ?? []).length, 1)
  assert.match(html, /Actions prioritaires/)
  assert.match(html, /Alertes/)
  assert.match(html, /Recommandations IA/)
  assert.match(html, /Dernières activités/)
})

test("injecte le garage actif sans modifier les fixtures métier", () => {
  const dashboard = buildGarageDashboard({ context: { garageName: "S.A.P" } })

  assert.equal(dashboard.summary.title, "Aujourd’hui chez S.A.P")
  assert.equal(dashboard.kpis.find((kpi) => kpi.id === "stock")?.value, "3")
})
