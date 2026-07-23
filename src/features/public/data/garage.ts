import { defaultTheme } from "../theme"
import type { GarageConfig } from "../types"

export const garage: GarageConfig = {
  id: "garage-os-demo",
  address: {
    postalCode: "59590",
    city: "Raismes",
    country: "France",
  },
  live: {
    enabled: true,
    siteName: "Garage OS",
    slogan: "Des véhicules sélectionnés avec exigence.",
    theme: defaultTheme,
    contact: {
      phone: "+33 3 00 00 00 00",
      email: "contact@example.com",
    },
    socialLinks: [],
    collectionFallbackImageUrl: "/live/vehicles/sports-sedan-hero.png",
    vehicleFallbackImageUrl: "/live/vehicles/sports-sedan-hero.png",
    vehicleTrustItems: [
      {
        id: "warranty",
        enabled: true,
        icon: "shield",
        title: "Garantie incluse",
        description: "Garantie mécanique de 12 mois.",
      },
      {
        id: "inspection",
        enabled: true,
        icon: "inspection",
        title: "Véhicule contrôlé",
        description: "Chaque véhicule est vérifié avant sa mise en vente.",
      },
      {
        id: "support",
        enabled: true,
        icon: "support",
        title: "Conseil personnalisé",
        description: "Notre équipe vous accompagne dans votre projet.",
      },
    ],
    modules: [
      {
        id: "catalog",
        enabled: true,
        navigation: { id: "catalog", label: "Nos véhicules", href: "/vehicles" },
        order: 1,
      },
      {
        id: "services",
        enabled: true,
        navigation: { id: "services", label: "Nos services", href: "/#services" },
        order: 2,
      },
      {
        id: "tradeIn",
        enabled: true,
        navigation: { id: "trade-in", label: "Reprise", href: "/#trade-in" },
        order: 3,
      },
      {
        id: "financing",
        enabled: true,
        navigation: { id: "financing", label: "Financement", href: "/#financing" },
        order: 4,
      },
      {
        id: "contact",
        enabled: true,
        navigation: { id: "contact", label: "Contact", href: "/#contact" },
        order: 5,
      },
      { id: "about", enabled: false, navigation: null, order: 6 },
      { id: "reviews", enabled: false, navigation: null, order: 7 },
    ],
    hero: {
      mode: "auto",
      eyebrow: "Garage OS Live",
      title: "Votre prochain véhicule commence ici.",
      description: "Découvrez une sélection de véhicules préparés et disponibles.",
      primaryAction: { id: "discover", label: "Découvrir les véhicules", href: "/vehicles" },
      secondaryAction: { id: "contact", label: "Nous contacter", href: "/#contact" },
      vehicleId: "bmw-m3-2015",
      trustItems: [
        { id: "selection", label: "Véhicules sélectionnés" },
        { id: "preparation", label: "Préparation professionnelle" },
      ],
    },
  },
}
