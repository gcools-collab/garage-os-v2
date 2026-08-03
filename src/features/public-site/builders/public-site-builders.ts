import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import type {
  GaragePublicViewModel,
  PublicContactViewModel,
  PublicHomepageViewModel,
  PublicSeoViewModel,
  PublicStockQuery,
  PublicStockViewModel,
  VehiclePublicCardViewModel,
} from "../types"

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})
const integer = new Intl.NumberFormat("fr-FR")
const PAGE_SIZE = 12

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
  return {
    slug: garage.garageSlug,
    name: garage.displayName,
    logoUrl: garage.branding.logoUrl,
    description: garage.branding.shortDescription ?? `Découvrez les véhicules de ${garage.displayName}.`,
    phone: garage.branding.phone,
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
      { label: "Accueil", href: base },
      { label: "Stock", href: `${base}/stock` },
      { label: "Contact", href: `${base}/contact` },
    ],
    theme: garage.liveTheme,
  }
}

export function buildVehiclePublicCard(
  vehicle: LiveStockVehicle,
  garage: GaragePublicViewModel
): VehiclePublicCardViewModel {
  const image = vehicle.photos.find((photo) => photo.isCover) ?? vehicle.photos[0] ?? null
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    href: `${garage.homeHref}/vehicules/${vehicle.slug}`,
    name: `${vehicle.make} ${vehicle.model}`,
    version: vehicle.version,
    image: image ? { url: image.url, alt: image.alt } : null,
    price: vehicle.priceCents === null ? "Prix sur demande" : money.format(vehicle.priceCents / 100),
    year: vehicle.year === null ? "Année non renseignée" : String(vehicle.year),
    mileage: vehicle.mileageKm === null ? "Kilométrage non renseigné" : `${integer.format(vehicle.mileageKm)} km`,
    fuel: vehicle.fuelType ?? "Énergie non renseignée",
    gearbox: vehicle.transmission ?? "Boîte non renseignée",
    bodyType: vehicle.bodyType ?? "Carrosserie non renseignée",
    badges: [],
    futureCapabilities: ["360", "FINANCING", "COMPARE", "FAVORITE"],
  }
}

export function buildPublicHomepage(
  garageRecord: PublicGarageContext,
  vehicles: readonly LiveStockVehicle[]
): PublicHomepageViewModel {
  const garage = buildGaragePublicViewModel(garageRecord)
  const cards = vehicles.map((vehicle) => buildVehiclePublicCard(vehicle, garage))
  const heroVehicle = vehicles.find((vehicle) => vehicle.photos.length > 0) ?? vehicles[0]
  const heroImage = heroVehicle?.photos.find((photo) => photo.isCover) ?? heroVehicle?.photos[0] ?? null
  return {
    garage,
    hero: {
      eyebrow: garage.name,
      title: vehicles.length
        ? `${vehicles.length} véhicule${vehicles.length > 1 ? "s" : ""} sélectionné${vehicles.length > 1 ? "s" : ""} pour vous`
        : "Votre prochain véhicule commence ici",
      description: garage.description,
      image: heroImage ? { url: heroImage.url, alt: heroImage.alt } : null,
      primaryAction: { label: "Découvrir le stock", href: `${garage.homeHref}/stock` },
      secondaryAction: garage.phone
        ? { label: "Appeler le garage", href: `tel:${garage.phone.replace(/\s/g, "")}` }
        : null,
    },
    sections: [
      { id: "SEARCH", enabled: true, title: "Recherche rapide", description: "Trouvez votre prochain véhicule." },
      { id: "FEATURED", enabled: cards.length > 0, title: "Véhicules en vedette", description: "La sélection du garage." },
      { id: "LATEST", enabled: cards.length > 0, title: "Dernières arrivées", description: "Les véhicules récemment publiés." },
      { id: "WHY_US", enabled: true, title: `Pourquoi choisir ${garage.name}`, description: "Un accompagnement professionnel, transparent et personnalisé." },
      { id: "SERVICES", enabled: true, title: "Nos services", description: "Des services pensés pour simplifier votre projet automobile." },
      { id: "FINANCING", enabled: true, title: "Financement", description: "Des solutions de financement seront bientôt disponibles." },
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
  return {
    garage,
    title: "Contactez-nous",
    description: `L’équipe ${garage.name} vous accompagne dans votre projet automobile.`,
    phoneHref: garage.phone ? `tel:${garage.phone.replace(/\s/g, "")}` : null,
    emailHref: garage.email ? `mailto:${garage.email}` : null,
    mapLabel: garage.address ?? "Localisation du garage",
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
