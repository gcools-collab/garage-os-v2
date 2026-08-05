import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { buildEnabledPublicServices, buildGarageServiceSettingsViewModel, garageServiceUpdateSchema } from "../services"

test("une configuration vide ne crée aucun service fictif", () => {
  assert.deepEqual(buildEnabledPublicServices("/g/futur", []), [])
})

test("les personnalisations et l'ordre persistent dans le ViewModel public", () => {
  const services = buildEnabledPublicServices("/g/futur", [{
    serviceKey: "BODYWORK", status: "ENABLED", publicTitle: "Carrosserie premium",
    publicDescription: "Remise en état.", publicCtaLabel: "Demander un devis", displayOrder: 4,
  }, {
    serviceKey: "WORKSHOP", status: "ENABLED", publicTitle: null,
    publicDescription: null, publicCtaLabel: null, displayOrder: 1,
  }])
  assert.deepEqual(services.map((service) => service.id), ["WORKSHOP", "BODYWORK"])
  assert.equal(services[1]?.title, "Carrosserie premium")
  assert.equal(services[1]?.actionLabel, "Demander un devis")
})

test("une capacité inconnue est refusée par la validation", () => {
  assert.equal(garageServiceUpdateSchema.safeParse({ services: [{ serviceKey: "UNKNOWN" }] }).success, false)
})

test("les membres ont une vue en lecture seule", () => {
  assert.equal(buildGarageServiceSettingsViewModel([], false).canEdit, false)
})

test("la persistance est tenant-scopée et réservée aux rôles autorisés", () => {
  const repository = readFileSync("src/features/public-site/services/garage-service-repository.ts", "utf8")
  const action = readFileSync("src/features/public-site/services/garage-service-actions.ts", "utf8")
  assert.match(repository, /\.eq\("garage_id", garageId\)/)
  assert.match(repository, /garage_id: garageId/)
  assert.match(action, /memberRole !== "owner" && session\.memberRole !== "admin"/)
  assert.doesNotMatch(repository + action, /GARAGE_OS_PUBLIC_SERVICES/)
})

test("la migration protège la table et n'initialise aucun garage", () => {
  const sql = readFileSync("supabase/migrations/20260804000041_create_garage_services.sql", "utf8")
  assert.match(sql, /enable row level security/)
  assert.match(sql, /gm\.role in \('owner', 'admin'\)/)
  assert.match(sql, /public_live_garage_services/)
  assert.doesNotMatch(sql, /363f2dc0-bfd3-48d6-a1cc-96e113e96094/)
})

test("les chemins publics et le sitemap sont revalidés", () => {
  const action = readFileSync("src/features/public-site/services/garage-service-actions.ts", "utf8")
  for (const path of ["/settings/services", "/services", "/location", "/depot-vente", "/contact", "/stock", "/sitemap.xml"]) {
    assert.match(action, new RegExp(path.replace("/", "\\/")))
  }
})

test("les routes settings et publiques canoniques existent", () => {
  assert.equal(existsSync("src/app/(dashboard)/settings/services/page.tsx"), true)
  for (const route of ["page.tsx", "services/page.tsx", "location/page.tsx", "depot-vente/page.tsx"]) {
    assert.equal(existsSync(`src/app/(public)/g/[garageSlug]/${route}`), true)
  }
})

test("une erreur de services dégrade le contexte sans masquer le garage", () => {
  const repository = readFileSync("src/features/live-stock/data/public-garage-repository.ts", "utf8")
  assert.match(repository, /servicesError \? \[\] : \(services \?\? \[\]\)/)
  assert.match(repository, /return mapPublicGarage\(record, configurations\)/)
  assert.doesNotMatch(repository, /if \(servicesError\) throw/)
})

test("la résolution publique utilise uniquement live_slug et jamais le nom", () => {
  const repository = readFileSync("src/features/live-stock/data/public-garage-repository.ts", "utf8")
  assert.match(repository, /\.eq\("live_slug", slug\)/)
  assert.doesNotMatch(repository, /\.eq\("(?:name|display_name)"/)
})
