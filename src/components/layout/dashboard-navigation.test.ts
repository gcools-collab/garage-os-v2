import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  dashboardNavigation,
  dashboardNavigationSections,
  isDashboardNavItemActive,
  resolveDashboardSectionTitle,
} from "./dashboard-navigation"
import { isRealPhotoUrl, userInitials } from "./user-identity"

const primaryHrefs = [
  "/dashboard",
  "/intelligence",
  "/leads",
  "/appointments",
  "/commercial",
  "/customers",
  "/billing",
  "/registration",
  "/stock",
  "/acquisition",
  "/market",
  "/analytics",
  "/copilot",
  "/settings",
] as const

test("la navigation partagée expose les destinations métier dans l’ordre opérationnel", () => {
  assert.deepEqual(dashboardNavigation.map((item) => item.href), [...primaryHrefs])
  assert.deepEqual(dashboardNavigationSections.map((section) => section.label), [
    "Aujourd’hui",
    "Commerce",
    "Véhicules",
    "Pilotage",
  ])
  assert.equal(dashboardNavigation.find((item) => item.href === "/stock")?.name, "Parc véhicules")
  assert.equal(dashboardNavigation.find((item) => item.href === "/commercial")?.name, "Suivi commercial")
  assert.equal(dashboardNavigation.find((item) => item.href === "/acquisition")?.name, "Recherche & achats")
  assert.equal(dashboardNavigation.find((item) => item.href === "/leads")?.name, "Demandes clients")
})

test("le titre de section suit la route courante, y compris les sous-pages", () => {
  assert.equal(resolveDashboardSectionTitle("/dashboard"), "Tableau de bord")
  assert.equal(resolveDashboardSectionTitle("/stock"), "Parc véhicules")
  assert.equal(resolveDashboardSectionTitle("/stock/new"), "Parc véhicules")
  assert.equal(resolveDashboardSectionTitle("/appointments/abc"), "Agenda")
  assert.equal(resolveDashboardSectionTitle("/intelligence"), "Priorités")
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
  assert.match(header, /isRealPhotoUrl/)
  assert.match(header, /userInitials/)
  assert.doesNotMatch(header, /branding\.logoUrl/)
  assert.doesNotMatch(header, />Tableau de bord</)

  assert.match(mobile, /md:hidden/)
  assert.match(mobile, /Sheet/)
  assert.match(mobile, /Ouvrir le menu de navigation/)
  assert.match(mobile, /h-11 w-11/)
  assert.match(mobile, /min-h-11/)
  assert.match(mobile, /SheetClose/)
  assert.match(mobile, /dashboardNavigationSections/)
  assert.match(mobile, /aria-current/)

  assert.match(sidebar, /dashboardNavigationSections/)
  assert.match(sidebar, /aria-current/)
  assert.doesNotMatch(sidebar, /Propulsé par Garage OS/)
  assert.doesNotMatch(sidebar, /branding\.subtitle/)

  for (const href of primaryHrefs) {
    assert.match(
      readFileSync("src/components/layout/dashboard-navigation.ts", "utf8"),
      new RegExp(`href: "${href}"`),
    )
  }
})

test("la photo utilisateur n’est acceptée que pour une URL réelle", () => {
  assert.equal(isRealPhotoUrl("https://cdn.example/avatar.jpg"), true)
  assert.equal(isRealPhotoUrl("http://cdn.example/avatar.jpg"), true)
  assert.equal(isRealPhotoUrl("/local.png"), false)
  assert.equal(isRealPhotoUrl("  "), false)
  assert.equal(isRealPhotoUrl(null), false)
  assert.equal(userInitials("Marie Dupont"), "MD")
  assert.equal(userInitials(null, "marie@example.com"), "MA")
})
