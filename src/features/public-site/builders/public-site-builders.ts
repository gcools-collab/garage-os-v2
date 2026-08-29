import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"
import { formatPublicVehicleDisplayName, formatVehicleMileage } from "@/features/vehicles/vehicle-presentation"
import type {
  GaragePublicViewModel,
  PublicContactViewModel,
  PublicHomepageViewModel,
  PublicNavigationItemViewModel,
  PublicProgramPageViewModel,
  PublicSeoViewModel,
  PublicServicesPageViewModel,
  PublicStockQuery,
  PublicStockViewModel,
  VehiclePublicCardViewModel,
} from "../types"
import { buildEnabledPublicServices } from "../services"

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})
const PAGE_SIZE = 12

function publicTelephoneHref(phone: string | null) {
  const digits = phone?.replace(/[^\d+]/g, "") ?? ""
  return digits ? `tel:${digits}` : null
}

function unique(values: readonly (string | null)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))]
    .sort((left, right) => left.localeCompare(right, "fr"))
}

export function buildPublicVehicleSlug(vehicle: {
  readonly make: string
  readonly model: string
  readonly year: number | null
  readonly id: string
}) {
  const text = `${vehicle.make}-${vehicle.model}-${vehicle.year ?? ""}-${vehicle.id.slice(0, 5)}`
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function buildGaragePublicViewModel(
  garage: PublicGarageContext
): GaragePublicViewModel {
  const base = garage.basePath
  const services = buildEnabledPublicServices(base, garage.serviceConfigurations ?? [{
    serviceKey: "VEHICLE_SALES",
    status: "ENABLED",
    publicTitle: null,
    publicDescription: null,
    publicCtaLabel: null,
    displayOrder: 0,
  }])
  const serviceIds = new Set(services.map((service) => service.id))
  return {
    slug: garage.garageSlug,
    name: garage.displayName,
    logoUrl: garage.branding.logoUrl,
    description: garage.branding.shortDescription ?? `Découvrez les véhicules de ${garage.displayName}.`,
    phone: garage.branding.phone?.trim()
      ? (garage.branding.formattedPhone?.trim() || garage.branding.phone)
      : null,
    phoneHref: publicTelephoneHref(garage.branding.phone),
    email: garage.branding.email,
    address: garage.branding.formattedAddress,
    socialLinks: [
      garage.branding.socialLinks.facebookUrl
        ? { label: "Facebook", href: garage.branding.socialLinks.facebookUrl } : null,
      garage.branding.socialLinks.instagramUrl
        ? { label: "Instagram", href: garage.branding.socialLinks.instagramUrl } : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null),
    openingHours: [],
    homeHref: base,
    navigation: [
      { label: "Nos véhicules", href: `${base}/stock`, children: [{ label: "Tous nos véhicules", href: `${base}/stock` }] },
      serviceIds.has("RENTAL") ? { label: "Location", href: `${base}/location` } : null,
      services.some((service) => service.id !== "VEHICLE_SALES") ? { label: "Services", href: `${base}/services` } : null,
      serviceIds.has("CONSIGNMENT") ? { label: "Dépôt-vente", href: `${base}/depot-vente` } : null,
      { label: "Nous contacter", href: `${base}/contact` },
    ].filter((item): item is NonNullable<typeof item> => item !== null),
    services,
    theme: garage.liveTheme,
  }
}

function selectPrimaryVehiclePhoto(vehicle: LiveStockVehicle) {
  const ordered = [
    vehicle.photos.find((photo) => photo.isCover),
    vehicle.photos[0],
    ...vehicle.photos,
  ].filter((photo, index, photos): photo is NonNullable<typeof photo> =>
    photo !== undefined && photos.indexOf(photo) === index
  )
  return ordered.find((photo) => isResolvableVehicleImageUrl(photo.url)) ?? null
}

export function buildVehiclePublicCard(
  vehicle: LiveStockVehicle,
  garage: GaragePublicViewModel
): VehiclePublicCardViewModel {
  const image = selectPrimaryVehiclePhoto(vehicle)
  const publicationDate = new Date(vehicle.publishedAt ?? vehicle.createdAt)
  const isNew = Number.isFinite(publicationDate.getTime())
    && Date.now() - publicationDate.getTime() <= 14 * 24 * 60 * 60 * 1000
  const badges = [
    vehicle.status === "RESERVED" ? "Réservé" : "Disponible",
    isNew ? "Nouveau" : null,
    vehicle.hasExterior360 ? "360°" : null,
    vehicle.hasInteriorTour ? "Visite virtuelle" : null,
  ].filter((badge): badge is string => badge !== null)
  const displayName = formatPublicVehicleDisplayName(vehicle.make, vehicle.model)
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    href: `${garage.homeHref}/vehicules/${vehicle.slug}`,
    name: displayName,
    version: vehicle.version,
    image: image ? { url: image.url, alt: image.alt || displayName } : null,
    price: vehicle.priceCents === null ? "Prix sur demande" : money.format(vehicle.priceCents / 100),
    year: vehicle.year === null ? "Année non renseignée" : String(vehicle.year),
    mileage: formatVehicleMileage(vehicle.mileageKm),
    fuel: vehicle.fuelType ?? "Énergie non renseignée",
    gearbox: vehicle.transmission ?? "Boîte non renseignée",
    bodyType: vehicle.bodyType?.trim() || null,
    badges,
    futureCapabilities: ["360", "VIRTUAL_TOUR", "COMPARE", "FAVORITE"],
  }
}

export function buildPublicHomepage(
  garageRecord: PublicGarageContext,
  vehicles: readonly LiveStockVehicle[]
): PublicHomepageViewModel {
  const garage = buildGaragePublicViewModel(garageRecord)
  const cards = vehicles.map((vehicle) => buildVehiclePublicCard(vehicle, garage))
  const heroVehicle = vehicles.find((vehicle) => selectPrimaryVehiclePhoto(vehicle) !== null) ?? null
  const heroImage = heroVehicle ? selectPrimaryVehiclePhoto(heroVehicle) : null
  return {
    garage,
    hero: {
      eyebrow: garage.name,
      title: "Votre prochain véhicule commence ici",
      description: garage.description,
      image: heroImage ? { url: heroImage.url, alt: heroImage.alt } : null,
      primaryAction: { label: "Découvrir nos véhicules", href: `${garage.homeHref}/stock` },
      secondaryAction: garage.phoneHref
        ? { label: "Appeler le garage", href: garage.phoneHref }
        : null,
    },
    sections: [
      { id: "SEARCH", enabled: true, title: "Recherche rapide", description: "Trouvez votre prochain véhicule." },
      { id: "FEATURED", enabled: cards.length > 0, title: "Véhicules en vedette", description: "La sélection du garage." },
      { id: "LATEST", enabled: cards.length > 0, title: "Dernières arrivées", description: "Les véhicules récemment publiés." },
      { id: "WHY_US", enabled: true, title: `Pourquoi choisir ${garage.name}`, description: "Un accompagnement professionnel, transparent et personnalisé." },
      { id: "SERVICES", enabled: true, title: "Nos services", description: "Des services pensés pour simplifier votre projet automobile." },
      { id: "FINANCING", enabled: false, title: "Financement", description: "" },
      { id: "TRADE_IN", enabled: true, title: "Reprise", description: "Préparez la reprise de votre véhicule avec notre équipe." },
      { id: "REVIEWS", enabled: false, title: "Avis clients", description: "Les avis seront prochainement disponibles." },
      { id: "CONTACT", enabled: true, title: "Parlons de votre projet", description: "Notre équipe est à votre écoute." },
    ],
    vehicleCount: cards.length,
    featuredVehicles: cards.slice(0, 3),
    latestVehicles: cards.slice(0, 6),
    quickSearch: {
      action: `${garage.homeHref}/stock`,
      brands: unique(vehicles.map((vehicle) => vehicle.make)),
      models: unique(vehicles.map((vehicle) => vehicle.model)),
      fuels: unique(vehicles.map((vehicle) => vehicle.fuelType)),
      gearboxes: unique(vehicles.map((vehicle) => vehicle.transmission)),
      years: unique(vehicles.map((vehicle) => vehicle.year === null ? null : String(vehicle.year))).sort((left, right) => right.localeCompare(left)),
    },
  }
}

function queryString(base: string, query: PublicStockQuery, page: number) {
  const params = new URLSearchParams()
  Object.entries({ ...query, page }).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value))
  })
  return `${base}?${params.toString()}`
}

export function buildPublicStock(
  garageRecord: PublicGarageContext,
  source: readonly LiveStockVehicle[],
  query: PublicStockQuery
): PublicStockViewModel {
  const garage = buildGaragePublicViewModel(garageRecord)
  const filtered = source.filter((vehicle) =>
    (!query.brand || vehicle.make === query.brand)
    && (!query.model || vehicle.model === query.model)
    && (!query.fuel || vehicle.fuelType === query.fuel)
    && (!query.gearbox || vehicle.transmission === query.gearbox)
    && (!query.bodyType || vehicle.bodyType === query.bodyType)
    && (!query.minPrice || (vehicle.priceCents ?? -1) >= query.minPrice * 100)
    && (!query.maxPrice || (vehicle.priceCents ?? Number.MAX_SAFE_INTEGER) <= query.maxPrice * 100)
    && (!query.minYear || (vehicle.year ?? -1) >= query.minYear)
    && (!query.maxMileage || (vehicle.mileageKm ?? Number.MAX_SAFE_INTEGER) <= query.maxMileage)
  )
  const sorted = [...filtered].sort((left, right) => {
    if (query.sort === "price-asc") return (left.priceCents ?? Number.MAX_SAFE_INTEGER) - (right.priceCents ?? Number.MAX_SAFE_INTEGER)
    if (query.sort === "price-desc") return (right.priceCents ?? -1) - (left.priceCents ?? -1)
    if (query.sort === "year-desc") return (right.year ?? -1) - (left.year ?? -1)
    if (query.sort === "mileage-asc") return (left.mileageKm ?? Number.MAX_SAFE_INTEGER) - (right.mileageKm ?? Number.MAX_SAFE_INTEGER)
    return (right.publishedAt ?? right.createdAt).localeCompare(left.publishedAt ?? left.createdAt)
  })
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(totalPages, Math.max(1, query.page ?? 1))
  const base = `${garage.homeHref}/stock`
  return {
    garage,
    title: "Nos véhicules disponibles",
    description: "Découvrez le stock actuellement proposé par le garage.",
    vehicles: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      .map((vehicle) => buildVehiclePublicCard(vehicle, garage)),
    resultLabel: `${filtered.length} véhicule${filtered.length > 1 ? "s" : ""}`,
    filters: {
      action: base,
      values: query,
      brands: unique(source.map((vehicle) => vehicle.make)),
      models: unique(source.map((vehicle) => vehicle.model)),
      fuels: unique(source.map((vehicle) => vehicle.fuelType)),
      gearboxes: unique(source.map((vehicle) => vehicle.transmission)),
      bodyTypes: unique(source.map((vehicle) => vehicle.bodyType)),
    },
    pagination: {
      page,
      totalPages,
      previousHref: page > 1 ? queryString(base, query, page - 1) : null,
      nextHref: page < totalPages ? queryString(base, query, page + 1) : null,
    },
    emptyMessage: filtered.length ? null : "Aucun véhicule ne correspond à ces critères.",
  }
}

export function buildPublicContact(
  garageRecord: PublicGarageContext
): PublicContactViewModel {
  const garage = buildGaragePublicViewModel(garageRecord)
  const ids = new Set(garage.services.map((service) => service.id))
  const serviceProjects = new Set([
    ...(ids.has("VEHICLE_SALES") ? ["buy", "test-drive", "trade-in"] : []),
    ...(ids.has("CONSIGNMENT") ? ["consignment"] : []),
    ...(ids.has("REGISTRATION") ? ["registration"] : []),
    ...(ids.has("ENGINE_CLEANING") ? ["engine-cleaning"] : []),
  ])
  return {
    garage,
    title: "Contactez-nous",
    description: `L’équipe ${garage.name} vous accompagne dans votre projet automobile.`,
    phoneHref: garage.phoneHref,
    emailHref: garage.email ? `mailto:${garage.email}` : null,
    mapLabel: garage.address ?? "Localisation du garage",
    journeys: [
      ["Acheter un véhicule", "buy"],
      ["Réserver un essai", "test-drive"],
      ["Faire reprendre mon véhicule", "trade-in"],
      ["Déposer un véhicule", "consignment"],
      ["Demander une carte grise", "registration"],
      ["Prendre rendez-vous pour un décalaminage", "engine-cleaning"],
      ["Demande libre", "other"],
    ].filter(([, project]) => project === "other" || serviceProjects.has(project))
      .map(([label, project]) => ({ label, href: `${garage.homeHref}/contact?project=${project}` })),
    form: {
      fields: [
        { name: "name", label: "Nom", type: "text" },
        { name: "email", label: "E-mail", type: "email" },
        { name: "phone", label: "Téléphone", type: "tel" },
        { name: "message", label: "Votre message", type: "textarea" },
      ],
      submitLabel: "Envoyer ma demande",
    },
  }
}

export function buildPublicServices(garageRecord: PublicGarageContext): PublicServicesPageViewModel {
  const garage = buildGaragePublicViewModel(garageRecord)
  return {
    garage,
    title: "Nos services automobiles",
    description: "Découvrez uniquement les services proposés par notre équipe.",
    services: garage.services.filter((service) => service.id !== "VEHICLE_SALES"),
  }
}

export function buildPublicProgram(
  garageRecord: PublicGarageContext,
  kind: "RENTAL" | "CONSIGNMENT",
): PublicProgramPageViewModel | null {
  const garage = buildGaragePublicViewModel(garageRecord)
  const service = garage.services.find((item) => item.id === kind)
  if (!service) return null
  const phoneHref = garage.phone ? `tel:${garage.phone.replace(/\s/g, "")}` : null
  const mapHref = garage.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(garage.address)}` : null
  const contact = { phoneHref, phoneLabel: garage.phone, address: garage.address, mapHref }
  const callAction: PublicNavigationItemViewModel | null = phoneHref ? { label: "Appeler le garage", href: phoneHref } : null
  return kind === "RENTAL" ? {
    garage,
    eyebrow: "Location",
    title: "Une solution de mobilité adaptée à votre besoin",
    description: "Contactez notre équipe pour connaître les véhicules et conditions actuellement disponibles.",
    benefits: ["Un accompagnement direct", "Des disponibilités confirmées par le garage", "Une demande sans engagement"],
    details: [
      { label: "Durée de location", value: "De 1 jour à plusieurs mois, jusqu’à 12 mois selon les disponibilités." },
      { label: "Réservation", value: "Une demande de devis en ligne, confirmée directement par le garage." },
      { label: "Documents à prévoir", value: "Permis de conduire valide, pièce d’identité et justificatif de domicile récent." },
      { label: "Conditions", value: "Dépôt de garantie et moyen de paiement à votre nom demandés au retrait du véhicule." },
    ],
    steps: [],
    reassurance: [],
    contact,
    action: { label: "Demander un devis", href: `${garage.homeHref}/contact?project=rental` },
    secondaryAction: callAction,
  } : {
    garage,
    eyebrow: "Dépôt-vente",
    title: "Confiez-nous la vente de votre véhicule",
    description: "Notre équipe vous accompagne dans la présentation et la commercialisation de votre véhicule.",
    benefits: ["Présentation professionnelle", "Gestion des contacts", "Accompagnement jusqu’à la vente"],
    details: [],
    steps: [
      { title: "Estimation de votre véhicule", description: "Nous étudions les caractéristiques et l’état de votre véhicule pour vous proposer une mise en vente adaptée." },
      { title: "Contrat de dépôt-vente", description: "Un contrat clair précise les conditions de présentation et de commercialisation, sans engagement caché." },
      { title: "Mise en avant du véhicule", description: "Votre véhicule est présenté et promu auprès des acheteurs potentiels par notre équipe." },
      { title: "Vente et versement", description: "Une fois la vente conclue, le montant convenu vous est reversé selon les modalités du contrat." },
    ],
    reassurance: ["Aucune vente sans votre accord préalable", "Interlocuteur dédié pour le suivi de votre dossier", "Présentation professionnelle de votre véhicule"],
    contact,
    action: { label: "Déposer mon véhicule", href: `${garage.homeHref}/contact?project=consignment` },
    secondaryAction: callAction,
  }
}

export function buildPublicSeo(input: {
  readonly garage: GaragePublicViewModel
  readonly pageTitle?: string
  readonly description?: string
  readonly canonicalPath: string
  readonly imageUrl?: string | null
}): PublicSeoViewModel {
  const title = input.pageTitle ? `${input.pageTitle} | ${input.garage.name}` : input.garage.name
  const description = input.description ?? input.garage.description
  return {
    title,
    description,
    canonicalPath: input.canonicalPath,
    openGraphImage: input.imageUrl ?? input.garage.logoUrl,
    structuredData: {
      "@context": "https://schema.org",
      "@type": ["AutoDealer", "LocalBusiness", "Organization"],
      name: input.garage.name,
      description,
      telephone: input.garage.phone,
      email: input.garage.email,
      address: input.garage.address,
      url: input.canonicalPath,
    },
  }
}

export function buildVehiclePublicSeo(input: {
  readonly garage: GaragePublicViewModel
  readonly vehicle: VehiclePublicCardViewModel
}): PublicSeoViewModel {
  const description = `${input.vehicle.name}, ${input.vehicle.year}, ${input.vehicle.mileage}. ${input.vehicle.price}.`
  return {
    title: `${input.vehicle.name} | ${input.garage.name}`,
    description,
    canonicalPath: input.vehicle.href,
    openGraphImage: input.vehicle.image?.url ?? input.garage.logoUrl,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Vehicle",
      name: input.vehicle.name,
      vehicleModelDate: input.vehicle.year,
      fuelType: input.vehicle.fuel,
      mileageFromOdometer: input.vehicle.mileage,
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        url: input.vehicle.href,
      },
      seller: {
        "@type": "AutoDealer",
        name: input.garage.name,
      },
    },
  }
}
