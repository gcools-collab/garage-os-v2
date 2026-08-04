import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { PublicGarageContext } from "@/features/live-stock"
import { getLiveThemeDefinition } from "@/features/theme"
import { buildGaragePublicViewModel, buildPublicContact, buildPublicProgram, buildPublicServices } from "../builders"
import { PublicProgramPage, PublicServicesPage } from "../components"
import { buildGarageServiceSettingsViewModel, resolveEnabledPublicServiceIds } from "../services"

const enabled = ["VEHICLE_SALES", "CONSIGNMENT", "RENTAL", "ENGINE_CLEANING", "REGISTRATION"] as const
const garage: PublicGarageContext = {
  garageId: "garage-sap",
  garageSlug: "sap",
  displayName: "Service Auto aux Particuliers",
  status: "ACTIVE",
  basePath: "/g/sap",
  serviceConfigurations: enabled.map((serviceKey, displayOrder) => ({
    serviceKey, status: "ENABLED", publicTitle: null, publicDescription: null,
    publicCtaLabel: null, displayOrder,
  })),
  liveTheme: getLiveThemeDefinition("black-yellow"),
  branding: {
    displayName: "Service Auto aux Particuliers", legalName: null, logoUrl: null,
    faviconUrl: null, phone: "0327000000", formattedPhone: "03 27 00 00 00",
    email: "contact@example.test", formattedAddress: "Raismes", shortDescription: null,
    socialLinks: { facebookUrl: null, instagramUrl: null }, themeKey: "black-yellow",
    colors: { primary: null, secondary: null, accent: null },
  },
}

test("la configuration tenant ne conserve que les services autorisés", () => {
  const ids = resolveEnabledPublicServiceIds([
    { serviceKey: "RENTAL", status: "ENABLED", displayOrder: 2 },
    { serviceKey: "VEHICLE_SALES", status: "ENABLED", displayOrder: 0 },
    { serviceKey: "WORKSHOP", status: "DISABLED", displayOrder: 1 },
  ])
  assert.deepEqual(ids, ["VEHICLE_SALES", "RENTAL"])
  assert.deepEqual(resolveEnabledPublicServiceIds([]), [])
})

test("le builder de réglages rend toutes les capacités administrables sans les activer", () => {
  const settings = buildGarageServiceSettingsViewModel([], true)
  assert.equal(settings.groups.flatMap((group) => group.services).length, 13)
  assert.ok(settings.groups.flatMap((group) => group.services).every((service) => service.status === "DISABLED"))
})

test("SAP expose uniquement ses services activés", () => {
  const publicGarage = buildGaragePublicViewModel(garage)
  assert.deepEqual(publicGarage.services.map((service) => service.id), enabled)
  assert.doesNotMatch(publicGarage.services.map((service) => service.title).join(" "), /Atelier|Entretien|Carrosserie|Pneumatiques|Diagnostic|Financement|Assurance|garantie/i)
})

test("navigation, services, location et dépôt-vente utilisent leurs ViewModels", () => {
  const publicGarage = buildGaragePublicViewModel(garage)
  assert.deepEqual(publicGarage.navigation.map((item) => item.label), ["Nos véhicules", "Location", "Services", "Dépôt-vente", "Nous contacter"])
  assert.ok(publicGarage.navigation[0].children?.length)
  const services = buildPublicServices(garage)
  const rental = buildPublicProgram(garage, "RENTAL")
  const consignment = buildPublicProgram(garage, "CONSIGNMENT")
  assert.ok(rental && consignment)
  assert.match(renderToStaticMarkup(<PublicServicesPage page={services} />), /Décalaminage moteur/)
  assert.match(renderToStaticMarkup(<PublicProgramPage page={rental} />), /solution de mobilité/)
  assert.match(renderToStaticMarkup(<PublicProgramPage page={consignment} />), /Confiez-nous la vente/)
})

test("le centre de contact prépare les sept parcours attendus", () => {
  const contact = buildPublicContact(garage)
  assert.equal(contact.journeys.length, 7)
  assert.match(contact.journeys.map((item) => item.label).join(" "), /Réserver un essai/)
})

test("les routes du parcours public V2 existent", () => {
  for (const route of ["services", "location", "depot-vente"]) {
    assert.equal(existsSync(`src/app/(public)/g/[garageSlug]/${route}/page.tsx`), true)
  }
})
