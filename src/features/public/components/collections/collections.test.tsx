import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import type { VisibleCollection } from "../../types"
import { formatVehicleCount } from "./collection-presentation"
import { CollectionsSection } from "./CollectionsSection"

const collections: VisibleCollection[] = [
  {
    id: "sport",
    slug: "sport-prestige",
    name: "Sport & Prestige",
    description: "Des modèles de caractère.",
    vehicleIds: ["vehicle-1"],
    active: true,
    order: 1,
    availableVehicleCount: 1,
    resolvedCoverImageUrl: "/live/vehicles/sports-sedan-hero.png",
  },
  {
    id: "selection",
    slug: "selection",
    name: "Sélection",
    vehicleIds: ["vehicle-2", "vehicle-3"],
    active: true,
    order: 2,
    availableVehicleCount: 2,
    resolvedCoverImageUrl: "/live/collections/fallback.jpg",
  },
]

test("formate le compteur au singulier et au pluriel", () => {
  assert.equal(formatVehicleCount(1), "1 véhicule")
  assert.equal(formatVehicleCount(2), "2 véhicules")
})

test("ne rend aucune section lorsque la liste est vide", () => {
  assert.equal(renderToStaticMarkup(<CollectionsSection collections={[]} />), "")
})

test("rend une carte par collection avec un seul SectionHeader", () => {
  const markup = renderToStaticMarkup(
    <CollectionsSection collections={collections} />
  )
  assert.equal((markup.match(/<article/g) ?? []).length, 2)
  assert.equal((markup.match(/<h2/g) ?? []).length, 1)
})

test("construit le lien de collection et affiche le compteur", () => {
  const markup = renderToStaticMarkup(
    <CollectionsSection collections={[collections[0]]} />
  )
  assert.match(markup, /\/vehicles\?collection=sport-prestige/)
  assert.match(markup, /1 véhicule/)
})

test("utilise directement l’image résolue fournie par le moteur", () => {
  const markup = renderToStaticMarkup(
    <CollectionsSection collections={[collections[1]]} />
  )
  assert.match(markup, /fallback\.jpg/)
})
