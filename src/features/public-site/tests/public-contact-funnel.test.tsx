import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { PublicGarageContext } from "@/features/live-stock"
import { getLiveThemeDefinition } from "@/features/theme"
import { buildPublicContact } from "@/features/public-site/builders/public-site-builders"
import { PublicContactPage } from "@/features/public-site/components/PublicContactPage"
import { buildPublicRequestForm, resolvePublicRequestType } from "@/features/public-leads/builders"
import { isPublicRequestAvailable } from "@/features/public-leads/engine"
import type { GarageServiceConfiguration } from "@/features/public-site/services"

const enabled = ["VEHICLE_SALES", "CONSIGNMENT", "RENTAL", "ENGINE_CLEANING", "REGISTRATION"] as const
const garage: PublicGarageContext = {
  garageId: "garage-sap",
  garageSlug: "sap",
  displayName: "Service Auto aux Particuliers",
  status: "ACTIVE",
  basePath: "/g/sap",
  serviceConfigurations: enabled.map((serviceKey, displayOrder) => ({
    serviceKey,
    status: "ENABLED",
    publicTitle: null,
    publicDescription: null,
    publicCtaLabel: null,
    displayOrder,
  })),
  liveTheme: getLiveThemeDefinition("black-yellow"),
  branding: {
    displayName: "Service Auto aux Particuliers",
    legalName: null,
    logoUrl: null,
    faviconUrl: null,
    phone: "0327000000",
    formattedPhone: "03 27 00 00 00",
    email: "contact@example.test",
    formattedAddress: "Raismes",
    shortDescription: null,
    socialLinks: { facebookUrl: null, instagramUrl: null },
    themeKey: "black-yellow",
    colors: { primary: null, secondary: null, accent: null },
  },
}

const services: readonly GarageServiceConfiguration[] = garage.serviceConfigurations ?? []
const contact = buildPublicContact(garage)
const registrationForm = buildPublicRequestForm("REGISTRATION")

test("sans project, le sélecteur générique reste visible", () => {
  const html = renderToStaticMarkup(
    <PublicContactPage contact={contact} selectedProject={null} request={null} />
  )

  assert.match(html, /Comment pouvons-nous vous aider/)
  assert.match(html, /Demander une carte grise/)
  assert.doesNotMatch(html, /Changer de demande/)
})

test("avec project=registration, le formulaire s'ouvre directement sans second clic", () => {
  const html = renderToStaticMarkup(
    <PublicContactPage
      contact={contact}
      selectedProject="registration"
      request={{
        form: registrationForm,
        vehicleSlug: null,
        vehicleContext: null,
        source: "SERVICE_PAGE",
        availability: [],
      }}
    />
  )

  assert.doesNotMatch(html, /Comment pouvons-nous vous aider/)
  assert.match(html, /Changer de demande/)
  assert.match(html, /Préparer une demande de carte grise/)
  assert.match(html, /name="requestType" value="REGISTRATION"/)
})

test("registration reste disponible quand l'offre catalogue existe sans procédures publiques", () => {
  const source = readFileSync(
    "src/app/(public)/g/[garageSlug]/contact/page.tsx",
    "utf8"
  )

  assert.match(source, /registrationUnavailable/)
  assert.match(source, /offerPresentations\.length === 0 &&\s*\n?\s*registrationProcedures\.length === 0/)
  assert.doesNotMatch(source, /registrationUnavailable=type==="REGISTRATION"&&registrationProcedures\.length===0/)
})

test("la page contact charge le garage en cache et évite le stock complet", () => {
  const source = readFileSync(
    "src/app/(public)/g/[garageSlug]/contact/page.tsx",
    "utf8"
  )

  assert.match(source, /getCachedPublicGarageContext/)
  assert.match(source, /getPublicContactVehicle/)
  assert.doesNotMatch(source, /getPublicSiteRecord/)
  assert.doesNotMatch(source, /record\.vehicles\.find/)
  assert.match(source, /Promise\.all/)
})

test("generateMetadata n'utilise pas le chargement complet du stock", () => {
  const source = readFileSync(
    "src/app/(public)/g/[garageSlug]/contact/page.tsx",
    "utf8"
  )

  assert.match(source, /generateMetadata[\s\S]*getCachedPublicGarageContext/)
  assert.doesNotMatch(source, /async function load\(/)
})

test("les CTA services pointent vers des projects valides", () => {
  const servicesSource = readFileSync(
    "src/features/public-site/services/public-services.ts",
    "utf8"
  )

  for (const project of [
    "registration",
    "engine-cleaning",
    "consignment",
  ]) {
    assert.match(servicesSource, new RegExp(`project=\\$\\{project\\}|project=${project}`))
  }
  assert.match(servicesSource, /depot-vente/)
  assert.match(servicesSource, /location/)
})

test("project=registration résout le type REGISTRATION", () => {
  assert.equal(resolvePublicRequestType("registration"), "REGISTRATION")
  assert.equal(isPublicRequestAvailable("REGISTRATION", services), true)
})

test("project invalide retombe sur null", () => {
  assert.equal(resolvePublicRequestType("unknown-flow"), null)
})

test("PublicContactPage affiche un fallback explicite pour demande indisponible", () => {
  const html = renderToStaticMarkup(
    <PublicContactPage
      contact={contact}
      selectedProject="registration"
      unavailableRequest
      request={null}
    />
  )

  assert.match(html, /Cette demande n’est pas disponible pour ce garage/)
  assert.match(html, /Changer de demande/)
})
