import {
  createLiveEngine,
  defaultTheme,
  type Collection,
  type GarageConfig,
  type LiveVehicleCatalogQuery,
  type Vehicle,
} from "@/features/public"
import type { PublicGarageContext, LiveStockVehicle } from "../types"
import { buildLiveStockCollections, resolveVehicleCoverPhoto } from "../engine"

function toPublicVehicle(
  vehicle: LiveStockVehicle,
  featuredIds: ReadonlySet<string>,
  collections: readonly Collection[]
): Vehicle {
  const images = vehicle.photos
    .filter((photo) => photo.url)
    .map((photo) => ({
      id: photo.id,
      url: photo.url,
      alt: photo.alt,
      isPrimary: photo.isCover,
    }))
  const cover = resolveVehicleCoverPhoto(vehicle.photos)
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    brand: vehicle.make,
    model: vehicle.model,
    trim: vehicle.version ?? undefined,
    year: vehicle.year ?? undefined,
    mileage: vehicle.mileageKm ?? undefined,
    fuel: vehicle.fuelType ?? undefined,
    gearbox: vehicle.transmission ?? undefined,
    sellingPrice: vehicle.priceCents === null ? undefined : vehicle.priceCents / 100,
    description: vehicle.description ?? undefined,
    fiscalPower: vehicle.fiscalPower ?? undefined,
    dinPower: vehicle.powerHp ?? undefined,
    co2Emissions: vehicle.co2Emissions ?? undefined,
    doors: vehicle.doors ?? undefined,
    seats: vehicle.seats ?? undefined,
    exteriorColor: vehicle.color ?? undefined,
    firstRegistrationDate: vehicle.registrationDate ?? undefined,
    ownersCount: vehicle.ownersCount ?? undefined,
    euroStandard: vehicle.euroStandard ?? undefined,
    critAir: vehicle.critAir === null ? undefined : String(vehicle.critAir),
    images,
    displayImage: cover?.url
      ? { id: cover.id, url: cover.url, alt: cover.alt, isPrimary: cover.isCover }
      : null,
    public: true,
    available: true,
    featured: featuredIds.has(vehicle.id),
    featuredPriority: featuredIds.has(vehicle.id) ? 100 : 0,
    addedAt: vehicle.publishedAt ?? vehicle.createdAt,
    collectionIds: collections
      .filter((collection) => collection.vehicleIds.includes(vehicle.id))
      .map((collection) => collection.id),
  }
}

export function buildPublicLiveEngine({
  garage,
  vehicles,
  now = new Date(),
}: {
  readonly garage: PublicGarageContext
  readonly vehicles: readonly LiveStockVehicle[]
  readonly now?: Date
}) {
  const collections = buildLiveStockCollections(vehicles, now)
  const featuredIds = new Set(
    vehicles
      .filter((vehicle) => vehicle.photos.length > 0)
      .slice(0, 6)
      .map((vehicle) => vehicle.id)
  )
  const basePath = garage.basePath
  const theme = {
    ...defaultTheme,
    themeKey: garage.liveTheme.key,
    colorOverrides: garage.branding.colors,
  }
  const config: GarageConfig = {
    id: garage.garageId,
    address: {
      postalCode: "",
      city: garage.branding.formattedAddress ?? "",
      country: "France",
    },
    live: {
      enabled: garage.status === "ACTIVE",
      basePath,
      siteName: garage.displayName,
      slogan: garage.branding.shortDescription ?? undefined,
      logo: garage.branding.logoUrl
        ? { url: garage.branding.logoUrl, alt: `Logo ${garage.displayName}` }
        : undefined,
      theme,
      contact: {
        phone: garage.branding.phone ?? undefined,
        email: garage.branding.email ?? undefined,
      },
      socialLinks: [
        garage.branding.socialLinks.facebookUrl
          ? { id: "facebook", label: "Facebook", href: garage.branding.socialLinks.facebookUrl, external: true }
          : null,
        garage.branding.socialLinks.instagramUrl
          ? { id: "instagram", label: "Instagram", href: garage.branding.socialLinks.instagramUrl, external: true }
          : null,
      ].filter((link): link is NonNullable<typeof link> => link !== null),
      collectionFallbackImageUrl: "",
      vehicleFallbackImageUrl: "",
      vehicleTrustItems: [],
      modules: [
        {
          id: "catalog",
          enabled: true,
          navigation: { id: "catalog", label: "Nos véhicules", href: `${basePath}/stock` },
          order: 1,
        },
        { id: "services", enabled: false, navigation: null, order: 2 },
        {
          id: "contact",
          enabled: Boolean(garage.branding.phone || garage.branding.email),
          navigation: { id: "contact", label: "Contact", href: `${basePath}#contact` },
          order: 3,
        },
      ],
      hero: {
        mode: "auto",
        eyebrow: garage.displayName,
        title: vehicles.length > 0
          ? `${vehicles.length} véhicule${vehicles.length > 1 ? "s" : ""} disponible${vehicles.length > 1 ? "s" : ""}`
          : "Notre stock arrive bientôt",
        description: garage.branding.shortDescription ?? "Découvrez les véhicules disponibles dans notre garage.",
        primaryAction: { id: "catalog", label: "Voir le catalogue", href: `${basePath}/stock` },
        trustItems: [],
      },
    },
  }
  return createLiveEngine({
    garage: config,
    vehicles: vehicles.map((vehicle) => toPublicVehicle(vehicle, featuredIds, collections)),
    collections,
    services: [],
  })
}

export function buildPublicHomepage(input: {
  readonly garage: PublicGarageContext
  readonly vehicles: readonly LiveStockVehicle[]
  readonly now?: Date
}) {
  return buildPublicLiveEngine(input).getLiveHomepage()
}

export function buildPublicCatalog(input: {
  readonly garage: PublicGarageContext
  readonly vehicles: readonly LiveStockVehicle[]
  readonly query: LiveVehicleCatalogQuery
  readonly now?: Date
}) {
  return buildPublicLiveEngine(input).getVehicleCatalog(input.query)
}

export function buildPublicVehicleDetail(input: {
  readonly garage: PublicGarageContext
  readonly vehicles: readonly LiveStockVehicle[]
  readonly vehicleSlug: string
  readonly now?: Date
}) {
  return buildPublicLiveEngine(input).getVehicleDetailBySlug(input.vehicleSlug)
}
