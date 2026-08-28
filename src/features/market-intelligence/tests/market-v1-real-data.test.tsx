import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { MarketDashboardPage } from "@/features/market-intelligence/components/dashboard/MarketDashboardPage"
import { buildMarketDashboardFromPersisted } from "@/features/market-intelligence/presentation/market-dashboard"
import type { GarageMarketDashboardRecord } from "@/features/market-intelligence/types/market-dashboard-record"

const baseVehicle = {
  id: "vehicle-1",
  brand: "Renault",
  model: "Clio",
  trim: null,
  year: 2020,
  mileage: 45_000,
  fuel: "Essence",
  gearbox: "Manuelle",
  sellingPrice: 12_500,
  primaryImageUrl: null,
} as const

const analysis = {
  id: "analysis-1",
  comparableCount: 8,
  minimumPrice: 10_000,
  maximumPrice: 14_500,
  averagePrice: 12_200,
  medianPrice: 12_000,
  currentVehiclePrice: 12_500,
  priceDifference: 500,
  priceDifferencePercent: 4.2,
  positioning: "IN_MARKET" as const,
  analyzedAt: "2026-08-20T10:00:00.000Z",
  provider: "leboncoin",
}

test("la page /market n'utilise plus les fixtures de démonstration", () => {
  const source = readFileSync("src/app/(dashboard)/market/page.tsx", "utf8")

  assert.match(source, /getGarageMarketDashboardData/)
  assert.match(source, /buildMarketDashboardFromPersisted/)
  assert.match(source, /session\.garageId/)
  assert.doesNotMatch(source, /marketListingsFixture/)
  assert.doesNotMatch(source, /@\/features\/public\/data/)
})

test("le repository filtre sur le garage actif uniquement", () => {
  const source = readFileSync(
    "src/features/market-intelligence/data/market-dashboard-repository.ts",
    "utf8"
  )

  assert.match(source, /\.eq\("garage_id", garageId\)/)
  assert.doesNotMatch(source, /garage_members.*map|\.in\("garage_id"/)
})

test("buildMarketDashboardFromPersisted affiche un état vide sans véhicules", () => {
  const dashboard = buildMarketDashboardFromPersisted({ garageId: "g1", vehicles: [] })

  assert.match(dashboard.emptyState?.title ?? "", /Aucun véhicule/)
  assert.equal(dashboard.vehicles.length, 0)
})

test("buildMarketDashboardFromPersisted affiche un état vide sans analyses enregistrées", () => {
  const record: GarageMarketDashboardRecord = {
    garageId: "g1",
    vehicles: [{ ...baseVehicle, analysis: null }],
  }
  const dashboard = buildMarketDashboardFromPersisted(record)

  assert.match(dashboard.emptyState?.title ?? "", /Aucune analyse marché enregistrée/)
  assert.equal(dashboard.vehicles.length, 0)
})

test("buildMarketDashboardFromPersisted utilise les analyses persistées réelles", () => {
  const record: GarageMarketDashboardRecord = {
    garageId: "g1",
    vehicles: [{ ...baseVehicle, analysis }],
  }
  const dashboard = buildMarketDashboardFromPersisted(record)

  assert.equal(dashboard.vehicles.length, 1)
  assert.equal(dashboard.vehicles[0]?.vehicleLabel, "Renault Clio")
  assert.equal(dashboard.vehicles[0]?.comparableCount, 8)
  assert.match(dashboard.vehicles[0]?.marketPrice ?? "", /12[\s\u202f]000/)
  assert.equal(dashboard.vehicles[0]?.detail.comparables.length, 0)
  assert.doesNotMatch(JSON.stringify(dashboard), /BMW M3|Jaguar|fixture/)
})

test("buildMarketDashboardFromPersisted calcule les KPI depuis les médianes persistées", () => {
  const record: GarageMarketDashboardRecord = {
    garageId: "g1",
    vehicles: [
      { ...baseVehicle, id: "v1", analysis: { ...analysis, medianPrice: 10_000 } },
      {
        ...baseVehicle,
        id: "v2",
        brand: "Peugeot",
        model: "208",
        sellingPrice: 14_000,
        analysis: {
          ...analysis,
          id: "analysis-2",
          medianPrice: 14_000,
          currentVehiclePrice: 14_000,
        },
      },
    ],
  }
  const dashboard = buildMarketDashboardFromPersisted(record)

  assert.equal(dashboard.summary.find((item) => item.id === "analyzed")?.value, "2")
  assert.match(
    dashboard.summary.find((item) => item.id === "market-price")?.value ?? "",
    /12[\s\u202f]000/
  )
})

test("MarketDashboardPage rend un état vide persisté sans comparables fictifs", () => {
  const html = renderToStaticMarkup(
    <MarketDashboardPage
      dashboard={buildMarketDashboardFromPersisted({ garageId: "g1", vehicles: [] })}
    />
  )

  assert.match(html, /Aucun véhicule à analyser/)
  assert.doesNotMatch(html, /BMW|Jaguar|Peugeot 308 Allure/)
})
