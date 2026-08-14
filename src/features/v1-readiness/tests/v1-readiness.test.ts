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
  "src/app/(dashboard)/stock/[id]/360/page.tsx",
  "src/app/(dashboard)/stock/[id]/interior-tour/page.tsx",
  "src/app/(dashboard)/stock/[id]/listings/page.tsx",
  "src/app/(dashboard)/copilot/page.tsx",
  "src/app/(public)/g/[garageSlug]/page.tsx",
  "src/app/(public)/g/[garageSlug]/stock/page.tsx",
  "src/app/(public)/g/[garageSlug]/vehicules/page.tsx",
  "src/app/(public)/g/[garageSlug]/contact/page.tsx",
  "src/app/(public)/g/[garageSlug]/services/page.tsx",
  "src/app/(public)/g/[garageSlug]/location/page.tsx",
  "src/app/(public)/g/[garageSlug]/depot-vente/page.tsx",
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

test("les segments privés et publics possèdent chargement et récupération d'erreur", () => {
  for (const file of [
    "src/app/(dashboard)/error.tsx",
    "src/app/(dashboard)/loading.tsx",
    "src/app/(public)/error.tsx",
    "src/app/(public)/loading.tsx",
    "src/app/not-found.tsx",
  ]) assert.equal(existsSync(file), true, file)

  const errorState = readFileSync("src/components/states/RouteErrorState.tsx", "utf8")
  assert.match(errorState, /Réessayer/)
  assert.match(errorState, /Vos données n’ont pas été modifiées/)
  assert.doesNotMatch(errorState, /error\.message|stack|digest/)
})

test("la publication invalide toutes les routes publiques V1", () => {
  const revalidation = readFileSync(
    "src/features/live-stock/revalidation/live-revalidation.ts",
    "utf8",
  )
  assert.match(revalidation, /basePath}\/stock/)
  assert.match(revalidation, /basePath}\/vehicules/)
  assert.match(revalidation, /basePath}\/vehicles/)
})

test("le centre de contact utilise les formulaires spécialisés et un fallback explicite", () => {
  const contact = readFileSync(
    "src/features/public-site/components/PublicContactPage.tsx",
    "utf8",
  )
  assert.match(contact, /PublicRequestForm/)
  assert.match(contact, /Cette demande n’est pas disponible pour ce garage/)
})
