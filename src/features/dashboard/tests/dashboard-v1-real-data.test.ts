import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildAppointmentDashboardSummary } from "@/features/scheduling/builders/scheduling-builders"
import type { AppointmentRecord } from "@/features/scheduling/types/scheduling"

const baseRow = {
  garage_id: "g1",
  lead_id: null,
  vehicle_id: null,
  type: "TEST_DRIVE",
  timezone: "Europe/Paris",
  customer_phone: null,
  customer_email: null,
  payment_required: false,
  details: {},
  created_at: "2026-08-01T09:00:00.000Z",
} as const

test("buildAppointmentDashboardSummary ignore les rendez-vous historiques importés", () => {
  const now = new Date("2026-08-28T12:00:00.000Z")
  const rows: AppointmentRecord[] = [
    {
      ...baseRow,
      id: "hist-today",
      status: "COMPLETED",
      starts_at: "2026-08-28T09:00:00.000Z",
      ends_at: "2026-08-28T09:30:00.000Z",
      customer_name: "Import SAP",
      is_historical: true,
    },
    {
      ...baseRow,
      id: "live-today",
      status: "CONFIRMED",
      starts_at: "2026-08-28T08:00:00.000Z",
      ends_at: "2026-08-28T08:30:00.000Z",
      customer_name: "Client actuel",
      is_historical: false,
    },
    {
      ...baseRow,
      id: "hist-upcoming",
      status: "PENDING",
      starts_at: "2026-08-29T09:00:00.000Z",
      ends_at: "2026-08-29T09:30:00.000Z",
      customer_name: "Import futur",
      is_historical: true,
    },
    {
      ...baseRow,
      id: "live-upcoming",
      status: "PENDING",
      starts_at: "2026-08-29T11:00:00.000Z",
      ends_at: "2026-08-29T11:30:00.000Z",
      customer_name: "Prospect",
      is_historical: false,
    },
  ]

  const summary = buildAppointmentDashboardSummary(rows, now)

  assert.equal(summary.today, 1)
  assert.equal(summary.upcoming, 1)
  assert.equal(summary.pending, 1)
})

test("la page dashboard n'utilise plus buildGarageDashboard avec fixture par défaut", () => {
  const source = readFileSync("src/app/(dashboard)/dashboard/page.tsx", "utf8")

  assert.match(source, /buildGarageDashboardFromBrief/)
  assert.match(source, /DailyCockpit/)
  assert.doesNotMatch(source, /buildGarageDashboard\s*\(/)
  assert.doesNotMatch(source, /DailyBriefCard/)
})

test("DashboardService filtre les véhicules sur le garage actif uniquement", () => {
  const source = readFileSync("src/features/dashboard/services/dashboard-service.ts", "utf8")

  assert.match(source, /\.eq\("garage_id", garageId\)/)
  assert.doesNotMatch(source, /\.in\("garage_id", garageIds\)/)
})

test("buildGarageDashboard exige des données explicites sans fixture par défaut", () => {
  const source = readFileSync(
    "src/features/intelligence/presentation/build-garage-dashboard.ts",
    "utf8"
  )

  assert.doesNotMatch(source, /garageIntelligenceFixture/)
  assert.match(source, /readonly data: GarageIntelligenceData/)
})
