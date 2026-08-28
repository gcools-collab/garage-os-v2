import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import { buildGaragePublicViewModel } from "../../builders"
import type { VehicleDetailPageViewModel } from "../presentation"
import { VehicleCTASectionBuilder } from "./vehicle-cta-section-builder"
import { VehicleHeroBuilder } from "./vehicle-hero-builder"
import { buildVehicleMedia } from "./vehicle-media-builder"
import { VehicleSEOBuilder } from "./vehicle-seo-builder"
import { VehicleSpecificationBuilder } from "./vehicle-specification-builder"
import { VehicleTrustBuilder } from "./vehicle-trust-builder"

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0,
})
const date = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "long", year: "numeric",
})
const EQUIPMENT_GROUPS = [
  { id: "comfort", title: "Confort", terms: ["clim", "chauff", "siège", "confort", "toit"] },
  { id: "safety", title: "Sécurité", terms: ["airbag", "abs", "esp", "sécurité", "alarme"] },
  { id: "multimedia", title: "Multimédia", terms: ["bluetooth", "carplay", "audio", "navigation", "gps"] },
  { id: "driving", title: "Aides à la conduite", terms: ["radar", "caméra", "régulateur", "parking", "angle mort"] },
  { id: "exterior", title: "Extérieur", terms: ["jante", "led", "xénon", "extérieur"] },
  { id: "interior", title: "Intérieur", terms: ["cuir", "alcantara", "intérieur", "volant"] },
] as const

function formatDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : date.format(parsed)
}

function commercialSummary(vehicle: LiveStockVehicle) {
  return [
    vehicle.ownersCount === 1 ? "Première main" : null,
    vehicle.mileageKm !== null && vehicle.mileageKm < 60_000 ? "Faible kilométrage" : null,
    vehicle.registrationDate ? "Historique renseigné" : null,
    vehicle.description ? "Présentation détaillée" : null,
    "Disponible immédiatement",
  ].filter((item): item is string => item !== null)
}

function equipmentGroups(vehicle: LiveStockVehicle) {
  const normalized = vehicle.equipment.map((item) => ({
    value: item,
    search: item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
  }))
  return EQUIPMENT_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    items: normalized
      .filter((item) => group.terms.some((term) => item.search.includes(
        term.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      )))
      .map((item) => item.value),
  })).filter((group) => group.items.length > 0)
}

export class VehicleDetailPageBuilder {
  build(input: {
    readonly garage: PublicGarageContext
    readonly vehicle: LiveStockVehicle
    readonly hasExterior360?: boolean
    readonly hasInteriorTour?: boolean
  }): VehicleDetailPageViewModel {
    const garage = buildGaragePublicViewModel(input.garage)
    const media = buildVehicleMedia(input.vehicle)
    const vehicleTitle = `${input.vehicle.make} ${input.vehicle.model}`
    const cta = new VehicleCTASectionBuilder().build(garage, vehicleTitle, input.vehicle.slug)
    return {
      garage,
      breadcrumbs: [
        { label: "Accueil", href: garage.homeHref },
        { label: "Stock", href: `${garage.homeHref}/stock` },
        { label: vehicleTitle, href: `${garage.homeHref}/vehicules/${input.vehicle.slug}` },
      ],
      hero: new VehicleHeroBuilder().build(input.vehicle, garage, media.domain),
      gallery: media.view,
      galleryCapabilities: {
        navigation: "CONTRACT",
        fullscreen: "CONTRACT",
        zoom: "CONTRACT",
        threeSixty: input.hasExterior360 ? "CONTRACT" : "PLACEHOLDER",
        video: "PLACEHOLDER",
      },
      commercialSummary: commercialSummary(input.vehicle),
      pricing: {
        mainPrice: input.vehicle.priceCents === null
          ? "Prix sur demande"
          : money.format(input.vehicle.priceCents / 100),
        vatLabel: null,
      },
      cta,
      specifications: new VehicleSpecificationBuilder().build(input.vehicle),
      description: {
        sellerDescription: input.vehicle.description?.trim() || null,
        highlights: commercialSummary(input.vehicle),
        observations: [],
      },
      equipmentGroups: equipmentGroups(input.vehicle),
      history: [
        input.vehicle.registrationDate
          ? { date: formatDate(input.vehicle.registrationDate), label: "Première mise en circulation" }
          : null,
        input.vehicle.publishedAt
          ? { date: formatDate(input.vehicle.publishedAt), label: `Publié par ${garage.name}` }
          : null,
      ].filter((item): item is NonNullable<typeof item> => item !== null),
      services: garage.services.map((service) => ({ id: service.id, title: service.title, description: service.description, href: service.href })),
      trust: new VehicleTrustBuilder().build(input.vehicle, garage),
      location: {
        garageName: garage.name,
        address: garage.address,
        openingHours: garage.openingHours,
        distanceLabel: "Distance bientôt disponible",
        mapLabel: garage.address ?? "Localisation du garage",
      },
      futureModules: [
        { id: "360", enabled: false }, { id: "VIDEO", enabled: false },
        { id: "HOTSPOTS", enabled: false }, { id: "COMPARE", enabled: false },
        { id: "FAVORITE", enabled: false }, { id: "CARVERTICAL", enabled: false },
        { id: "AI", enabled: false }, { id: "MARKET", enabled: false },
        { id: "INSPECTION", enabled: false },
      ],
      seo: new VehicleSEOBuilder().build({
        vehicle: input.vehicle,
        garage,
        media: media.domain,
      }),
    }
  }
}
