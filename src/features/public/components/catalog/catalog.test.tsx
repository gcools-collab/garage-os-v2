import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { collections, garage, services, vehicles } from "../../data"
import { createLiveEngine } from "../../lib/live-engine"
import { VehicleCatalogPage } from "./VehicleCatalogPage"
import { VehicleCatalogPagination } from "./VehicleCatalogPagination"

const engine = createLiveEngine({ garage, vehicles, collections, services })

test("rend un seul h1, le fil d’Ariane et le compteur", () => {
  const catalog = engine.getVehicleCatalog()
  const markup = renderToStaticMarkup(<VehicleCatalogPage catalog={catalog} />)
  assert.equal((markup.match(/<h1/g) ?? []).length, 1)
  assert.match(markup, /Fil d’Ariane/)
  assert.match(markup, /3 véhicules disponibles/)
})

test("rend une carte publique et un lien par résultat", () => {
  const catalog = engine.getVehicleCatalog()
  const markup = renderToStaticMarkup(<VehicleCatalogPage catalog={catalog} />)
  assert.equal((markup.match(/<article/g) ?? []).length, catalog.vehicles.length)
  assert.match(markup, /\/vehicles\/bmw-m3-2015/)
})

test("affiche les filtres et leurs options préparées", () => {
  const markup = renderToStaticMarkup(<VehicleCatalogPage catalog={engine.getVehicleCatalog({ brand: "BMW" })} />)
  assert.match(markup, /Marque/)
  assert.match(markup, /BMW \(1\)/)
  assert.match(markup, /value="BMW" selected/)
  assert.match(markup, /Supprimer le filtre Marque : BMW/)
  assert.match(markup, /Réinitialiser/)
})

test("affiche l’état vide préparé sans grille", () => {
  const catalog = engine.getVehicleCatalog({ minPrice: 100000 })
  const markup = renderToStaticMarkup(<VehicleCatalogPage catalog={catalog} />)
  assert.match(markup, /Aucun véhicule ne correspond/)
  assert.equal((markup.match(/<article/g) ?? []).length, 0)
})

test("masque la pagination sur une page et l’affiche sur plusieurs", () => {
  const pagination = engine.getVehicleCatalog().pagination
  assert.equal(renderToStaticMarkup(<VehicleCatalogPagination pagination={pagination} />), "")
  const markup = renderToStaticMarkup(
    <VehicleCatalogPagination pagination={{
      ...pagination,
      totalPages: 2,
      nextHref: "/vehicles?page=2",
    }} />
  )
  assert.match(markup, /Pagination du catalogue/)
  assert.match(markup, /Suivant/)
})
