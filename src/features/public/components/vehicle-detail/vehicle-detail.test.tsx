import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import type {
  LiveTrustIcon,
  LiveVehicleCard,
  LiveVehicleDetail,
  Vehicle,
} from "../../types"
import { formatPrice } from "../ui"
import { getNextImageIndex, getPreviousImageIndex } from "./gallery-navigation"
import { SimilarVehiclesSection } from "./SimilarVehiclesSection"
import { VehicleDescriptionSection } from "./VehicleDescriptionSection"
import { VehicleDetailPage } from "./VehicleDetailPage"
import { VehicleGallery } from "./VehicleGallery"
import { VehicleTrustCard } from "./VehicleTrustCard"

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
    { id: "phone", label: "Appeler le garage", href: "tel:+33300000000", variant: "primary" },
    { id: "email", label: "Envoyer un e-mail", href: "mailto:contact@example.com", variant: "secondary" },
  ],
  description: {
    introduction: "Une sportive préparée avec exigence.",
    highlights: ["Historique disponible"],
  },
  specifications: [{
    id: "engine",
    title: "Motorisation",
    items: [{ label: "Puissance DIN", value: "431 ch" }],
  }],
  equipmentGroups: [{
    id: "comfort",
    title: "Confort",
    items: ["Sièges chauffants"],
  }],
  trustItems: [{
    id: "warranty",
    icon: "shield",
    title: "Garantie incluse",
    description: "Garantie mécanique.",
  }],
  similarVehicles: [],
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

test("masque la description vide et rend les points forts disponibles", () => {
  assert.equal(
    renderToStaticMarkup(
      <VehicleDescriptionSection description={{ highlights: [] }} />
    ),
    ""
  )
  const markup = renderToStaticMarkup(
    <VehicleDescriptionSection
      description={{ highlights: ["Historique disponible"] }}
    />
  )
  assert.match(markup, /Historique disponible/)
})

test("rend les caractéristiques, équipements et réassurances préparés", () => {
  const markup = renderToStaticMarkup(<VehicleDetailPage detail={detail} />)
  assert.match(markup, /Motorisation/)
  assert.match(markup, /431 ch/)
  assert.match(markup, /Sièges chauffants/)
  assert.match(markup, /Garantie incluse/)
  assert.doesNotMatch(markup, />undefined</)
})

test("hiérarchise les CTA uniquement depuis leur variante préparée", () => {
  const markup = renderToStaticMarkup(<VehicleDetailPage detail={detail} />)
  assert.match(markup, /bg-\[var\(--live-primary\)\]/)
  assert.match(markup, /bg-transparent/)
})

test("masque les véhicules similaires vides et rend leurs liens", () => {
  assert.equal(
    renderToStaticMarkup(<SimilarVehiclesSection vehicles={[]} />),
    ""
  )
  const card: LiveVehicleCard = {
    id: "similar",
    slug: "similar",
    displayName: "Peugeot 308 GT Line",
    image: null,
    price: 21990,
    metadata: [],
    href: "/vehicles/peugeot-308-gt-line",
  }
  const markup = renderToStaticMarkup(
    <SimilarVehiclesSection vehicles={[card]} />
  )
  assert.equal((markup.match(/<article/g) ?? []).length, 1)
  assert.match(markup, /\/vehicles\/peugeot-308-gt-line/)
})

test("prépare les contrôles et le compteur de la galerie", () => {
  const markup = renderToStaticMarkup(
    <VehicleGallery images={detail.images} displayName={detail.displayName} />
  )
  assert.match(markup, /1 \/ 2/)
  assert.match(markup, /Afficher l’image précédente/)
  assert.match(markup, /Afficher l’image suivante/)
  assert.match(markup, /aria-current="true"/)
})

test("masque les contrôles lorsque la galerie ne contient qu’une image", () => {
  const markup = renderToStaticMarkup(
    <VehicleGallery images={[detail.images[0]]} displayName={detail.displayName} />
  )
  assert.doesNotMatch(markup, /Afficher l’image précédente/)
  assert.doesNotMatch(markup, /Afficher l’image suivante/)
})

test("boucle proprement les helpers de navigation de galerie", () => {
  assert.equal(getPreviousImageIndex(0, 3), 2)
  assert.equal(getNextImageIndex(2, 3), 0)
  assert.equal(getNextImageIndex(0, 1), 0)
})

test("conserve un fallback visuel pour un identifiant d’icône inconnu", () => {
  const markup = renderToStaticMarkup(
    <VehicleTrustCard
      item={{
        id: "future",
        icon: "future-icon" as LiveTrustIcon,
        title: "Service",
        description: "Accompagnement.",
      }}
    />
  )
  assert.match(markup, /Service/)
  assert.match(markup, /<svg/)
})
