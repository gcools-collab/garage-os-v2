import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const routeFiles = [
  "src/app/(auth)/login/page.tsx",
  "src/app/(auth)/register/page.tsx",
  "src/app/(auth)/select-garage/page.tsx",
  "src/app/(dashboard)/dashboard/page.tsx",
  "src/app/(dashboard)/stock/page.tsx",
  "src/app/(dashboard)/stock/[id]/page.tsx",
  "src/app/(dashboard)/acquisition/page.tsx",
  "src/app/(dashboard)/market/page.tsx",
  "src/app/(dashboard)/commercial/page.tsx",
  "src/app/(dashboard)/leads/page.tsx",
  "src/app/(dashboard)/publication/[vehicleId]/page.tsx",
  "src/app/(public)/g/[garageSlug]/page.tsx",
  "src/app/(public)/g/[garageSlug]/stock/page.tsx",
  "src/app/(public)/g/[garageSlug]/contact/page.tsx",
  "src/app/(public)/g/[garageSlug]/vehicules/[vehicleSlug]/page.tsx",
] as const

test("les routes critiques de démonstration existent", () => {
  for (const route of routeFiles) assert.equal(existsSync(route), true, route)
})

test("la navigation principale n'expose aucune route morte connue", () => {
  const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8")
  assert.doesNotMatch(sidebar, /href: "\/(alerts|diffusion)"/)
  assert.doesNotMatch(sidebar, /Buying Assistant|Market Intelligence/)
  assert.match(sidebar, /aria-current/)
})

test("la vitrine n'affiche pas de chiffres commerciaux fictifs", () => {
  const builder = readFileSync(
    "src/features/public-site-premium/builders/premium-homepage-builder.ts",
    "utf8",
  )
  assert.doesNotMatch(builder, /value: "100 %"|value: "1", label: "équipe dédiée"/)
})

test("le sélecteur de garage déduplique les appartenances par garage", () => {
  const resolver = readFileSync(
    "src/features/tenant/engine/resolve-active-garage-session.ts",
    "utf8",
  )
  assert.match(resolver, /candidate\.garageId === membership\.garageId/)
})
