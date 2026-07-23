import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import type { LiveVehicleDetail, Vehicle } from "../../types"
import { formatPrice } from "../ui"
import { VehicleDetailPage } from "./VehicleDetailPage"

const vehicle: Vehicle = {
  id: "bmw-m3",
  slug: "bmw-m3-f80",
  brand: "BMW",
  model: "M3",
  trim: "F80",
  year: 2019,
  mileage: 72000,
  fuel: "Essence",
  gearbox: "Automatique",
  sellingPrice: 39990,
  images: [],
  public: true,
  available: true,
  featured: true,
  featuredPriority: 100,
  addedAt: "2026-07-23T00:00:00.000Z",
  collectionIds: [],
}

const detail: LiveVehicleDetail = {
  vehicle,
  displayName: "BMW M3 F80",
  subtitle: "Une berline sportive préparée avec exigence.",
  price: 39990,
  images: [
    {
      id: "primary",
      url: "/live/vehicles/sports-sedan-hero.png",
      alt: "BMW M3 F80",
      isPrimary: true,
    },
    {
      id: "secondary",
      url: "/live/vehicles/sports-sedan-hero.png?view=2",
      alt: "BMW M3 F80 de profil",
      isPrimary: false,
    },
  ],
  primaryImage: {
    id: "primary",
    url: "/live/vehicles/sports-sedan-hero.png",
    alt: "BMW M3 F80",
    isPrimary: true,
  },
  metadata: [
    { id: "year", label: "Année", value: "2019" },
    { id: "mileage", label: "Kilométrage", value: "72 000 km" },
    { id: "fuel", label: "Carburant", value: "Essence" },
    { id: "gearbox", label: "Boîte de vitesses", value: "Automatique" },
    { id: "trim", label: "Finition", value: "F80" },
  ],
  status: "available",
  contactActions: [
    { id: "phone", label: "Appeler le garage", href: "tel:+33300000000" },
    { id: "email", label: "Envoyer un e-mail", href: "mailto:contact@example.com" },
  ],
  seo: {
    title: "BMW M3 F80 | Garage OS",
    description: "BMW M3 F80 chez Garage OS.",
  },
}

test("rend la fiche avec un seul h1 et son fil d’Ariane", () => {
  const markup = renderToStaticMarkup(<VehicleDetailPage detail={detail} />)
  assert.equal((markup.match(/<h1/g) ?? []).length, 1)
  assert.match(markup, /Fil d’Ariane/)
  assert.match(markup, />Accueil</)
  assert.match(markup, />Véhicules</)
})

test("affiche le statut disponible ou indisponible depuis le ViewModel", () => {
  assert.match(
    renderToStaticMarkup(<VehicleDetailPage detail={detail} />),
    /Disponible/
  )
  assert.match(
    renderToStaticMarkup(
      <VehicleDetailPage detail={{ ...detail, status: "unavailable" }} />
    ),
    /Indisponible/
  )
})

test("affiche le prix et les métadonnées préparées", () => {
  const markup = renderToStaticMarkup(<VehicleDetailPage detail={detail} />)
  assert.ok(markup.includes(formatPrice(detail.price ?? undefined)))
  for (const item of detail.metadata) assert.ok(markup.includes(item.value))
})

test("rend la galerie préparée avec image principale et miniature", () => {
  const markup = renderToStaticMarkup(<VehicleDetailPage detail={detail} />)
  assert.match(markup, /sports-sedan-hero\.png/)
  assert.match(markup, /view%3D2|view=2/)
})

test("rend un fallback visuel lorsque le ViewModel ne contient aucune image", () => {
  const markup = renderToStaticMarkup(
    <VehicleDetailPage
      detail={{ ...detail, images: [], primaryImage: null }}
    />
  )
  assert.match(markup, /Visuel bientôt disponible/)
})

test("affiche uniquement les actions de contact fournies", () => {
  const markup = renderToStaticMarkup(<VehicleDetailPage detail={detail} />)
  assert.match(markup, /Appeler le garage/)
  assert.match(markup, /Envoyer un e-mail/)
  assert.match(markup, /tel:\+33300000000/)
  assert.match(markup, /mailto:contact@example\.com/)
})
