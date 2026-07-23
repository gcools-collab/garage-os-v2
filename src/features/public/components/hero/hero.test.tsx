import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import type { HeroContent, Vehicle } from "../../types"
import { formatPrice, getVehicleMetaItems } from "../ui"
import { Hero } from "./Hero"
import { resolveHeroImage } from "./VehicleHero"

const vehicle: Vehicle = {
  id: "vehicle",
  slug: "vehicle",
  brand: "BMW",
  model: "M3",
  trim: "F80",
  year: 2019,
  mileage: 72000,
  fuel: "Essence",
  gearbox: "Automatique",
  sellingPrice: 39990,
  images: [
    {
      id: "image",
      url: "/live/vehicles/sports-sedan-hero.png",
      alt: "BMW M3 en studio",
      isPrimary: true,
    },
  ],
  displayImage: {
    id: "image",
    url: "/live/vehicles/sports-sedan-hero.png",
    alt: "BMW M3 en studio",
    isPrimary: true,
  },
  public: false,
  available: false,
  featured: false,
  featuredPriority: 0,
  addedAt: "2026-01-01T00:00:00.000Z",
  collectionIds: [],
}

const shared = {
  eyebrow: "Sélection",
  title: "Un véhicule d’exception.",
  description: "Une expérience automobile exigeante.",
  primaryAction: { id: "primary", label: "Découvrir", href: "/vehicles" },
  trustItems: [{ id: "selection", label: "Véhicules sélectionnés" }],
}

test("rend la variante vehicle avec le véhicule fourni sans le sélectionner", () => {
  const hero: HeroContent = { ...shared, mode: "vehicle", vehicle }
  const markup = renderToStaticMarkup(<Hero hero={hero} />)
  assert.match(markup, /BMW/)
  assert.match(markup, /M3/)
  assert.match(markup, /Véhicules sélectionnés/)
  assert.equal((markup.match(/<h1/g) ?? []).length, 1)
})

test("rend la variante editorial sans véhicule", () => {
  const hero: HeroContent = { ...shared, mode: "editorial", vehicle: null }
  const markup = renderToStaticMarkup(<Hero hero={hero} />)
  assert.match(markup, /Un véhicule d’exception/)
  assert.doesNotMatch(markup, /Visuel bientôt disponible/)
  assert.equal((markup.match(/<h1/g) ?? []).length, 1)
})

test("rend la variante fallback avec une configuration minimale", () => {
  const hero: HeroContent = {
    mode: "fallback",
    title: "Bienvenue",
    vehicle: null,
    trustItems: [],
  }
  const markup = renderToStaticMarkup(<Hero hero={hero} />)
  assert.match(markup, /Bienvenue/)
  assert.equal((markup.match(/<h1/g) ?? []).length, 1)
})

test("omet les métadonnées véhicule absentes", () => {
  const items = getVehicleMetaItems({
    ...vehicle,
    year: undefined,
    mileage: undefined,
    fuel: undefined,
    gearbox: " ",
  })
  assert.deepEqual(items, [])
})

test("formate le prix avec Intl.NumberFormat français", () => {
  assert.equal(
    formatPrice(39990),
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(39990)
  )
  assert.equal(formatPrice(undefined), "Prix sur demande")
})

test("gère un véhicule sans image sans erreur", () => {
  const hero: HeroContent = {
    ...shared,
    mode: "vehicle",
    vehicle: { ...vehicle, images: [], displayImage: null },
  }
  assert.equal(resolveHeroImage(hero.vehicle), null)
  assert.match(renderToStaticMarkup(<Hero hero={hero} />), /Visuel bientôt disponible/)
})

test("accepte une action secondaire facultative", () => {
  const withoutSecondary: HeroContent = {
    ...shared,
    mode: "fallback",
    vehicle: null,
  }
  const withSecondary: HeroContent = {
    ...withoutSecondary,
    secondaryAction: { id: "secondary", label: "Nous contacter", href: "/contact" },
  }
  assert.doesNotMatch(renderToStaticMarkup(<Hero hero={withoutSecondary} />), /Nous contacter/)
  assert.match(renderToStaticMarkup(<Hero hero={withSecondary} />), /Nous contacter/)
})
