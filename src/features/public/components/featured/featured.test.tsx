import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import type { LiveVehicleCard } from "../../types"
import { formatPrice } from "../ui"
import { FeaturedVehiclesSection } from "./FeaturedVehiclesSection"

const vehicle: LiveVehicleCard = {
  id: "bmw-m3",
  slug: "bmw-m3-f80",
  displayName: "BMW M3 F80",
  price: 39990,
  metadata: [
    { id: "year", label: "Année", value: "2019" },
    { id: "mileage", label: "Kilométrage", value: "72 000 km" },
  ],
  image: {
    id: "display",
    url: "/live/vehicles/sports-sedan-hero.png",
    alt: "BMW M3 F80",
    isPrimary: true,
  },
  badge: { label: "Coup de cœur", icon: "heart" },
  href: "/vehicles/bmw-m3-f80",
}

test("ne rend aucune section lorsque la liste est vide", () => {
  assert.equal(renderToStaticMarkup(<FeaturedVehiclesSection vehicles={[]} />), "")
})

test("rend une carte par véhicule avec un seul SectionHeader", () => {
  const markup = renderToStaticMarkup(
    <FeaturedVehiclesSection vehicles={[vehicle, { ...vehicle, id: "second" }]} />
  )
  assert.equal((markup.match(/<article/g) ?? []).length, 2)
  assert.equal((markup.match(/<h2/g) ?? []).length, 1)
})

test("affiche le badge uniquement pour un véhicule featured", () => {
  const featuredMarkup = renderToStaticMarkup(
    <FeaturedVehiclesSection vehicles={[vehicle]} />
  )
  const regularMarkup = renderToStaticMarkup(
    <FeaturedVehiclesSection vehicles={[{ ...vehicle, badge: undefined }]} />
  )
  assert.match(featuredMarkup, /Coup de cœur/)
  assert.doesNotMatch(regularMarkup, /Coup de cœur/)
})

test("construit le CTA vers le futur détail véhicule", () => {
  const markup = renderToStaticMarkup(
    <FeaturedVehiclesSection vehicles={[vehicle]} />
  )
  assert.match(markup, /Voir le véhicule/)
  assert.match(markup, /\/vehicles\/bmw-m3-f80/)
})

test("réutilise la présentation du prix et des métadonnées", () => {
  const markup = renderToStaticMarkup(
    <FeaturedVehiclesSection vehicles={[vehicle]} />
  )
  assert.ok(markup.includes(formatPrice(vehicle.price ?? undefined)))
  for (const item of vehicle.metadata) {
    assert.ok(markup.includes(item.value))
  }
})

test("affiche directement l’image préparée par le moteur", () => {
  const markup = renderToStaticMarkup(
    <FeaturedVehiclesSection vehicles={[vehicle]} />
  )
  assert.match(markup, /sports-sedan-hero\.png/)
})

test("utilise l’image fallback déjà résolue sans la recalculer", () => {
  const fallbackVehicle: LiveVehicleCard = {
    ...vehicle,
    image: {
      id: "fallback",
      url: "/live/vehicles/fallback.png",
      alt: "Visuel véhicule",
      isPrimary: false,
    },
  }
  const markup = renderToStaticMarkup(
    <FeaturedVehiclesSection vehicles={[fallbackVehicle]} />
  )
  assert.match(markup, /fallback\.png/)
})
