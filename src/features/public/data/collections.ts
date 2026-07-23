import type { Collection } from "../types"

export const collections: Collection[] = [
  {
    id: "selection-du-moment",
    slug: "selection-du-moment",
    name: "Sélection du moment",
    description: "Les véhicules récemment sélectionnés par notre équipe.",
    vehicleIds: ["peugeot-308-gt-line", "renault-clio-rs-line"],
    active: true,
    order: 1,
  },
  {
    id: "sport-prestige",
    slug: "sport-prestige",
    name: "Sport & Prestige",
    description: "Des modèles de caractère choisis pour les passionnés.",
    vehicleIds: ["bmw-m3-2015"],
    coverImageUrl: "/live/vehicles/sports-sedan-hero.png",
    active: true,
    order: 2,
  },
]
