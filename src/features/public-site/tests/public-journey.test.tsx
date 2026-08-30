import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { readFileSync } from "node:fs"
import type { PublicGarageContext } from "@/features/live-stock"
import { getLiveThemeDefinition } from "@/features/theme"
import { resolvePublicRequestType } from "@/features/public-leads"
import { buildGaragePublicViewModel, buildPublicContact, buildPublicProgram, buildPublicServices } from "../builders"
import { PublicContactPage, PublicProgramPage, PublicServicesPage, PublicSiteLayout } from "../components"
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
  const servicesHtml = renderToStaticMarkup(<PublicServicesPage page={services} />)
  assert.match(servicesHtml, /Décalaminage moteur/)
  assert.match(servicesHtml, /Démarches d’immatriculation/)
  assert.match(servicesHtml, /Effectuer une démarche d’immatriculation/)
  assert.match(servicesHtml, /WW provisoire/)
  assert.match(servicesHtml, /26,60/)
  assert.match(servicesHtml, /Diagnostic électronique/)
  assert.match(servicesHtml, /Passage de la valise/)
  assert.match(servicesHtml, /ne peut pas toujours être effacé/)
  assert.match(renderToStaticMarkup(<PublicProgramPage page={rental} />), /Location de véhicules/)
  assert.doesNotMatch(renderToStaticMarkup(<PublicProgramPage page={rental} />), /Location de véhicules avec Cargo/)
  assert.match(renderToStaticMarkup(<PublicProgramPage page={consignment} />), /Confiez-nous la vente/)
})

test("le centre de contact prépare les sept parcours attendus", () => {
  const contact = buildPublicContact(garage)
  assert.equal(contact.journeys.length, 7)
  assert.match(contact.journeys.map((item) => item.label).join(" "), /Demander un essai/)
})

test("les routes du parcours public V2 existent", () => {
  for (const route of ["services", "location", "depot-vente"]) {
    assert.equal(existsSync(`src/app/(public)/g/[garageSlug]/${route}/page.tsx`), true)
  }
})

test("la location expose durée, documents, conditions, téléphone et itinéraire", () => {
  const rental = buildPublicProgram(garage, "RENTAL")
  assert.ok(rental)
  const labels = rental.details.map((detail) => detail.label).join(" ")
  assert.match(labels, /Durée de location/)
  assert.match(labels, /Documents à prévoir/)
  assert.match(labels, /Conditions/)
  assert.match(rental.details.map((detail) => detail.value).join(" "), /1 jour.*12 mois/)
  assert.equal(rental.contact.phoneHref, "tel:0327000000")
  assert.ok(rental.contact.mapHref?.includes("google.com/maps"))
  const html = renderToStaticMarkup(<PublicProgramPage page={rental} />)
  assert.match(html, /Réserver en ligne/)
  assert.doesNotMatch(html, /Réserver chez Cargo/)
  assert.doesNotMatch(html, /ne se substitue pas/)
  assert.match(html, /Demander un devis/)
  assert.match(html, /Obtenir mon itinéraire/)
  assert.match(html, /Informations pratiques/)
  assert.match(html, /cargo\.fr\/Location\/Booking/)
  assert.match(html, /rel="noopener noreferrer"/)
  assert.match(html, /opérée par Cargo/)
  assert.match(html, /cargo-location/)
  assert.match(html, /Visuel CarGo/)
  assert.equal(existsSync("public/partners/cargo-location.png"), true)
})

test("le dépôt-vente expose ses étapes et sa réassurance", () => {
  const consignment = buildPublicProgram(garage, "CONSIGNMENT")
  assert.ok(consignment)
  assert.equal(consignment.steps.length, 4)
  assert.ok(consignment.reassurance.length > 0)
  const html = renderToStaticMarkup(<PublicProgramPage page={consignment} />)
  assert.match(html, /Comment ça marche/)
  assert.match(html, /Estimation de votre véhicule/)
  assert.match(html, /Nos engagements/)
  assert.match(html, /Déposer mon véhicule/)
  assert.match(html, /Nous appeler/)
  assert.ok(html.indexOf("Comment ça marche") < html.indexOf("Présentation professionnelle"))
})

test("le footer public expose identité, appel, e-mail, itinéraire et réseaux", () => {
  const branded = {
    ...garage,
    branding: {
      ...garage.branding,
      socialLinks: { facebookUrl: "https://facebook.com/sap", instagramUrl: "https://instagram.com/sap" },
    },
  }
  const html = renderToStaticMarkup(<PublicSiteLayout garage={buildGaragePublicViewModel(branded)}><p>contenu</p></PublicSiteLayout>)
  assert.match(html, /Facebook/)
  assert.match(html, /Instagram/)
  assert.match(html, /Mentions légales/)
  assert.match(html, /Confidentialité/)
  assert.match(html, /Obtenir mon itinéraire/)
  assert.match(html, /Nous appeler/)
})

test("le parcours location est résolu et ouvre un vrai formulaire (plus de demande vide)", () => {
  assert.equal(resolvePublicRequestType("rental"), "RENTAL")
  const contact = buildPublicContact(garage)
  const html = renderToStaticMarkup(
    <PublicContactPage
      contact={contact}
      selectedProject="rental"
      request={{ form: { type: "RENTAL", contextHeading: null, title: "Demande de location", description: "Le garage vous informera des possibilités disponibles.", submitLabel: "Être recontacté", steps: [{ id: "contact", title: "Vos coordonnées" }], fields: [] }, vehicleSlug: null, vehicleContext: null, source: "SERVICE_PAGE", availability: [] }}
    />
  )
  assert.match(html, /Location/)
  assert.doesNotMatch(html, /Cette demande n.est pas disponible/)
})

test("l'en-tête public expose Nous appeler à droite, sans Rendez-vous, avec un menu mobile", () => {
  const services = buildPublicServices(garage)
  const html = renderToStaticMarkup(<PublicSiteLayout garage={services.garage}><p>contenu</p></PublicSiteLayout>)
  assert.match(html, /href="tel:0327000000"/)
  assert.match(html, /Nous appeler/)
  assert.match(html, /Ouvrir le menu/)
  assert.doesNotMatch(html, /Rendez-vous/)
  assert.doesNotMatch(html, /Appeler le garage/)
})

test("les cartes véhicule alignent leur CTA en bas de carte quelle que soit la description", () => {
  for (const file of [
    "src/features/public-site/components/VehiclePublicCard.tsx",
    "src/features/public-site-premium/components/PremiumVehicleCard.tsx",
  ]) {
    const source = readFileSync(file, "utf8")
    assert.match(source, /flex h-full flex-col/)
    assert.match(source, /mt-auto/)
  }
})
