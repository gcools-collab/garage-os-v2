import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { DailyCockpit, buildDailyCockpitKpis } from "../components/daily-cockpit"
import type { DashboardKpiViewModel, DashboardListItemViewModel } from "@/features/intelligence"
import type { LeadDashboardSummaryViewModel } from "@/features/leads"

const kpis: readonly DashboardKpiViewModel[] = [
  { id: "stock", label: "Stock", value: "12", detail: "véhicules actifs", tone: "neutral" },
  { id: "stock-value", label: "Valeur du stock", value: "84 990 €", detail: "prix de vente renseignés", tone: "neutral" },
  { id: "invested-capital", label: "Capital immobilisé", value: "60 000 €", detail: "achats et frais engagés", tone: "warning" },
  { id: "potential-margin", label: "Marge potentielle", value: "8 000 €", detail: "sur les prix renseignés", tone: "positive" },
  { id: "rotation", label: "Rotation", value: "12,5 %", detail: "ventes des 30 derniers jours", tone: "warning" },
]

const leads: LeadDashboardSummaryViewModel = {
  newCount: 2,
  toContactCount: 1,
  appointmentRequestCount: 0,
  overdueCount: 0,
  newTodayCount: 2,
  testDriveCount: 1,
  tradeInCount: 0,
  serviceRequestCount: 1,
  message: "2 demandes à traiter aujourd’hui.",
}

const appointments = { today: 1, upcoming: 3, pending: 1, awaitingPayment: 0 }

test("le cockpit assemble 6 indicateurs réels sans reprendre la rotation", () => {
  const selected = buildDailyCockpitKpis(kpis, appointments, leads)
  assert.deepEqual(selected.map((item) => item.id), [
    "stock",
    "stock-value",
    "invested-capital",
    "potential-margin",
    "appointments-today",
    "leads-today",
  ])
  assert.equal(selected.find((item) => item.id === "appointments-today")?.value, "1")
  assert.equal(selected.find((item) => item.id === "leads-today")?.value, "2")
})

test("le cockpit reste compact, sans table, avec empty et alertes limitées", () => {
  const alerts: DashboardListItemViewModel[] = [
    { id: "a1", title: "Alerte 1", description: "Véhicule A", tone: "danger" },
    { id: "a2", title: "Alerte 2", description: "Véhicule B", tone: "warning" },
    { id: "a3", title: "Alerte 3", description: "Véhicule C", tone: "warning" },
    { id: "a4", title: "Alerte 4", description: "Véhicule D", tone: "danger" },
  ]
  const html = renderToStaticMarkup(
    <DailyCockpit
      greeting="Bonjour Marie"
      garageName="S.A.P"
      headline="3 actions importantes aujourd’hui"
      kpis={buildDailyCockpitKpis(kpis, appointments, leads)}
      priority={{ action: "Relancer Julie", reason: "Demande non contactée", href: "/leads/lead-a", ctaLabel: "Ouvrir le prospect" }}
      emptyPriority={null}
      appointments={appointments}
      leads={leads}
      alerts={alerts}
    />,
  )

  assert.equal((html.match(/<h1/g) ?? []).length, 1)
  assert.match(html, /Bonjour Marie/)
  assert.match(html, /Prochaine action/)
  assert.match(html, /Agenda/)
  assert.match(html, /Demandes clients/)
  assert.match(html, /Voir tout/)
  assert.match(html, /1 autre alerte/)
  assert.doesNotMatch(html, /Alerte 4/)
  assert.doesNotMatch(html, /<table/)
  assert.doesNotMatch(html, /Brief du jour/)
  assert.doesNotMatch(html, /Garage Intelligence/)
})

test("le cockpit affiche les états vides sans les masquer", () => {
  const emptyLeads: LeadDashboardSummaryViewModel = {
    ...leads,
    newTodayCount: 0,
    testDriveCount: 0,
    tradeInCount: 0,
    serviceRequestCount: 0,
    toContactCount: 0,
    message: null,
  }
  const html = renderToStaticMarkup(
    <DailyCockpit
      greeting="Bonjour"
      garageName="Garage vide"
      headline="Tout est sous contrôle"
      kpis={buildDailyCockpitKpis([], { today: 0, upcoming: 0, pending: 0, awaitingPayment: 0 }, emptyLeads)}
      priority={null}
      emptyPriority={{ title: "Ajoutez votre premier véhicule.", description: "Le cockpit se remplira avec l’activité réelle." }}
      appointments={{ today: 0, upcoming: 0, pending: 0, awaitingPayment: 0 }}
      leads={emptyLeads}
      alerts={[]}
    />,
  )

  assert.match(html, /Ajoutez votre premier véhicule/)
  assert.match(html, /Aucune alerte active/)
  assert.match(html, /Aucune demande en attente/)
  assert.match(html, /Aucun rendez-vous à traiter/)
})

test("la page dashboard n’empile plus brief, copilote et intelligence", () => {
  const source = readFileSync("src/app/(dashboard)/dashboard/page.tsx", "utf8")
  assert.match(source, /DailyCockpit/)
  assert.match(source, /buildGarageDashboardFromBrief/)
  assert.doesNotMatch(source, /DailyBriefCard/)
  assert.doesNotMatch(source, /GarageIntelligenceDashboard/)
  assert.doesNotMatch(source, /CopilotDashboardCard/)
  assert.doesNotMatch(source, /CommercialDashboardSignal/)
})
