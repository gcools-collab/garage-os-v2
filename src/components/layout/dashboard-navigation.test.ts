import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  dashboardNavigation,
  isDashboardNavItemActive,
  resolveDashboardSectionTitle,
} from "./dashboard-navigation"

const primaryHrefs = [
  "/dashboard",
  "/intelligence",
  "/copilot",
  "/commercial",
  "/stock",
  "/acquisition",
  "/leads",
  "/customers",
  "/appointments",
  "/billing",
  "/registration",
  "/market",
  "/analytics",
  "/settings",
] as const

test("la navigation partagée expose toutes les destinations principales", () => {
  assert.deepEqual(dashboardNavigation.map((item) => item.href), [...primaryHrefs])
})

test("le titre de section suit la route courante, y compris les sous-pages", () => {
  assert.equal(resolveDashboardSectionTitle("/dashboard"), "Tableau de bord")
  assert.equal(resolveDashboardSectionTitle("/stock"), "Stock")
  assert.equal(resolveDashboardSectionTitle("/stock/new"), "Stock")
  assert.equal(resolveDashboardSectionTitle("/appointments/abc"), "Agenda")
  assert.equal(resolveDashboardSectionTitle("/notifications"), "Tableau de bord")
  assert.equal(isDashboardNavItemActive("/customers/1", "/customers"), true)
  assert.equal(isDashboardNavItemActive("/stock", "/dashboard"), false)
})

test("le header mobile expose un déclencheur Sheet et les liens principaux", () => {
  const header = readFileSync("src/components/layout/header.tsx", "utf8")
  const mobile = readFileSync("src/components/layout/dashboard-mobile-nav.tsx", "utf8")
  const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8")

  assert.match(header, /DashboardMobileNav/)
  assert.match(header, /DashboardSectionTitle/)
  assert.doesNotMatch(header, />Tableau de bord</)

  assert.match(mobile, /md:hidden/)
  assert.match(mobile, /Sheet/)
  assert.match(mobile, /Ouvrir le menu de navigation/)
  assert.match(mobile, /h-11 w-11/)
  assert.match(mobile, /min-h-11/)
  assert.match(mobile, /SheetClose/)
  assert.match(mobile, /dashboardNavigation/)
  assert.match(mobile, /aria-current/)

  assert.match(sidebar, /dashboardNavigation/)
  assert.match(sidebar, /aria-current/)

  for (const href of primaryHrefs) {
    assert.match(
      readFileSync("src/components/layout/dashboard-navigation.ts", "utf8"),
      new RegExp(`href: "${href}"`),
    )
  }
})
