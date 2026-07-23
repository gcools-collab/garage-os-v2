import type { GarageConfig } from "../types"

export const garage: GarageConfig = {
  id: "garage-os-demo",
  name: "Garage OS",
  tagline: "Des véhicules sélectionnés avec exigence.",
  description: "Un showroom automobile pensé pour une expérience simple et transparente.",
  contact: {
    phone: "+33 3 00 00 00 00",
    email: "contact@example.com",
  },
  address: {
    postalCode: "59590",
    city: "Raismes",
    country: "France",
  },
  navigation: [
    { id: "home", label: "Accueil", href: "/" },
    { id: "vehicles", label: "Nos véhicules", href: "/vehicles" },
    { id: "services", label: "Nos services", href: "/#services" },
    { id: "contact", label: "Contact", href: "/#contact" },
  ],
  hero: {
    eyebrow: "Garage OS Live",
    title: "Votre prochain véhicule commence ici.",
    description: "Découvrez une sélection de véhicules préparés et disponibles.",
    primaryAction: { id: "discover", label: "Découvrir les véhicules", href: "/vehicles" },
    featuredVehicleId: "bmw-m3-2015",
  },
  themeId: "garage-os-default",
}
