import { collections, garage, services, vehicles } from "../data"
import type {
  FeaturedVehicleOptions,
  GarageConfig,
  HeroContent,
  LiveEngineData,
  LiveHomepage,
  LiveModuleConfig,
  LiveVehicleDetail,
  LiveVehicleMetadataItem,
  NavigationItem,
  Service,
  Vehicle,
  VisibleCollection,
} from "../types"

const DEFAULT_FEATURED_LIMIT = 6

function clone<T>(value: T): T {
  return structuredClone(value)
}

function byVehiclePriority(first: Vehicle, second: Vehicle) {
  if (first.featured !== second.featured) return first.featured ? -1 : 1
  if (first.featuredPriority !== second.featuredPriority) {
    return second.featuredPriority - first.featuredPriority
  }
  const dateDifference = Date.parse(second.addedAt) - Date.parse(first.addedAt)
  return dateDifference || first.id.localeCompare(second.id)
}

function byOrder<T extends { order: number; id: string }>(first: T, second: T) {
  return first.order - second.order || first.id.localeCompare(second.id)
}

function isPubliclyAvailable(vehicle: Vehicle) {
  return vehicle.public && vehicle.available
}

export function createLiveEngine(source: LiveEngineData) {
  function prepareDetailImages(vehicle: Vehicle) {
    const imagesByUrl = new Map<string, Vehicle["images"][number]>()
    for (const image of vehicle.images) {
      const url = image.url.trim()
      if (!url) continue
      const existing = imagesByUrl.get(url)
      if (!existing || (image.isPrimary && !existing.isPrimary)) {
        imagesByUrl.set(url, image)
      }
    }
    const validImages = [...imagesByUrl.values()]
    const primary = validImages.find((image) => image.isPrimary)
    const orderedImages = primary
      ? [primary, ...validImages.filter((image) => image.id !== primary.id)]
      : validImages
    if (orderedImages.length > 0) return clone(orderedImages)
    const fallbackUrl = source.garage.live.vehicleFallbackImageUrl.trim()
    if (!fallbackUrl) return []
    return [{
      id: `${vehicle.id}-detail-fallback`,
      url: fallbackUrl,
      alt: `${vehicle.brand} ${vehicle.model}`,
      isPrimary: true,
    }]
  }

  function prepareDetailMetadata(vehicle: Vehicle): LiveVehicleMetadataItem[] {
    return [
      vehicle.year
        ? { id: "year" as const, label: "Année", value: String(vehicle.year) }
        : null,
      vehicle.mileage !== undefined
        ? {
            id: "mileage" as const,
            label: "Kilométrage",
            value: `${new Intl.NumberFormat("fr-FR").format(vehicle.mileage)} km`,
          }
        : null,
      vehicle.fuel?.trim()
        ? { id: "fuel" as const, label: "Carburant", value: vehicle.fuel.trim() }
        : null,
      vehicle.gearbox?.trim()
        ? {
            id: "gearbox" as const,
            label: "Boîte de vitesses",
            value: vehicle.gearbox.trim(),
          }
        : null,
      vehicle.trim?.trim()
        ? { id: "trim" as const, label: "Finition", value: vehicle.trim.trim() }
        : null,
    ].filter((item): item is LiveVehicleMetadataItem => item !== null)
  }

  function prepareContactActions(): NavigationItem[] {
    const contact = source.garage.live.contact
    const phone = contact.phone?.replace(/[^\d+]/g, "")
    const email = contact.email?.trim()
    const whatsapp = contact.whatsapp?.replace(/\D/g, "")
    return [
      phone
        ? { id: "phone", label: "Appeler le garage", href: `tel:${phone}` }
        : null,
      email
        ? { id: "email", label: "Envoyer un e-mail", href: `mailto:${encodeURI(email)}` }
        : null,
      whatsapp
        ? {
            id: "whatsapp",
            label: "Contacter sur WhatsApp",
            href: `https://wa.me/${whatsapp}`,
            external: true,
          }
        : null,
    ].filter((action): action is NavigationItem => action !== null)
  }

  function prepareVehicle(vehicle: Vehicle): Vehicle {
    const resolvedImage =
      vehicle.displayImage ??
      vehicle.images.find((image) => image.isPrimary) ??
      vehicle.images[0] ??
      {
        id: `${vehicle.id}-fallback`,
        url: source.garage.live.vehicleFallbackImageUrl,
        alt: `${vehicle.brand} ${vehicle.model}`,
        isPrimary: false,
      }
    return { ...clone(vehicle), displayImage: clone(resolvedImage) }
  }

  function getGarageConfig(): GarageConfig {
    return clone(source.garage)
  }

  function getEnabledModuleConfigs(): LiveModuleConfig[] {
    if (!source.garage.live.enabled) return []
    return source.garage.live.modules.filter((module) => module.enabled).sort(byOrder)
  }

  function getNavigation(): NavigationItem[] {
    return clone(
      getEnabledModuleConfigs().flatMap((module) =>
        module.navigation ? [module.navigation] : []
      )
    )
  }

  function getHeroVehicle(): Vehicle | null {
    const eligibleVehicles = source.vehicles.filter(isPubliclyAvailable)
    const configuredId = source.garage.live.hero.vehicleId
    const explicitVehicle = configuredId
      ? eligibleVehicles.find((vehicle) => vehicle.id === configuredId)
      : undefined
    if (explicitVehicle) return prepareVehicle(explicitVehicle)

    const featuredVehicle = eligibleVehicles
      .filter((vehicle) => vehicle.featured)
      .sort(byVehiclePriority)[0]
    if (featuredVehicle) return prepareVehicle(featuredVehicle)

    const latestVehicle = eligibleVehicles.sort(
      (first, second) =>
        Date.parse(second.addedAt) - Date.parse(first.addedAt) ||
        first.id.localeCompare(second.id)
    )[0]
    return latestVehicle ? prepareVehicle(latestVehicle) : null
  }

  function getHeroContent(): HeroContent {
    const config = source.garage.live.hero
    const vehicle =
      source.garage.live.enabled && config.mode !== "editorial"
        ? getHeroVehicle()
        : null
    const content = {
      eyebrow: config.eyebrow,
      title: config.title,
      description: config.description,
      primaryAction: clone(config.primaryAction),
      secondaryAction: clone(config.secondaryAction),
      trustItems: clone(config.trustItems),
    }
    if (config.mode === "editorial") {
      return { ...content, mode: "editorial", vehicle: null }
    }
    if (vehicle) return { ...content, mode: "vehicle", vehicle }
    return { ...content, mode: "fallback", vehicle: null }
  }

  function getFeaturedVehicles(options: FeaturedVehicleOptions = {}): Vehicle[] {
    const limit = Math.max(0, options.limit ?? DEFAULT_FEATURED_LIMIT)
    return source.vehicles
        .filter((vehicle) => vehicle.public)
        .filter((vehicle) => options.includeUnavailable || vehicle.available)
        .filter(
          (vehicle) =>
            !options.collectionId || vehicle.collectionIds.includes(options.collectionId)
        )
        .sort(byVehiclePriority)
        .slice(0, limit)
        .map(prepareVehicle)
  }

  function getVisibleCollections(): VisibleCollection[] {
    return source.collections
      .filter((collection) => collection.active)
      .map((collection) => {
        const eligibleVehicles = collection.vehicleIds.flatMap((vehicleId) => {
          const vehicle = source.vehicles.find(
            (candidate) => candidate.id === vehicleId && isPubliclyAvailable(candidate)
          )
          return vehicle ? [vehicle] : []
        })
        if (eligibleVehicles.length === 0) return null
        const primaryImage = eligibleVehicles[0].images.find((image) => image.isPrimary)
        return {
          ...clone(collection),
          availableVehicleCount: eligibleVehicles.length,
          resolvedCoverImageUrl:
            collection.coverImageUrl ??
            primaryImage?.url ??
            source.garage.live.collectionFallbackImageUrl,
        }
      })
      .filter((collection): collection is VisibleCollection => collection !== null)
      .sort(byOrder)
  }

  function getVisibleServices(): Service[] {
    return clone(
      source.services
        .filter((service) => service.active && service.public)
        .sort(byOrder)
    )
  }

  function getPublicVehicleSlugs(): string[] {
    return source.vehicles
      .filter((vehicle) => vehicle.public)
      .map((vehicle) => vehicle.slug)
  }

  function getVehicleDetailBySlug(slug: string): LiveVehicleDetail | null {
    const vehicle = source.vehicles.find(
      (candidate) => candidate.slug === slug && candidate.public
    )
    if (!vehicle) return null
    const images = prepareDetailImages(vehicle)
    const displayName = [vehicle.brand, vehicle.model, vehicle.trim]
      .filter(Boolean)
      .join(" ")
    const mileage = vehicle.mileage === undefined
      ? null
      : `${new Intl.NumberFormat("fr-FR").format(vehicle.mileage)} km`
    const seoParts = [displayName, vehicle.year, mileage].filter(Boolean)
    return {
      vehicle: clone(vehicle),
      displayName,
      subtitle: vehicle.description?.trim() || undefined,
      price: vehicle.sellingPrice ?? null,
      images,
      primaryImage: images[0] ?? null,
      metadata: prepareDetailMetadata(vehicle),
      status: vehicle.available ? "available" : "unavailable",
      contactActions: prepareContactActions(),
      seo: {
        title: `${displayName} | ${source.garage.live.siteName}`,
        description: `Découvrez ${seoParts.join(", ")} chez ${source.garage.live.siteName}.`,
      },
    }
  }

  function getLiveHomepage(): LiveHomepage {
    const live = source.garage.live
    const enabledModuleConfigs = getEnabledModuleConfigs()
    const enabledModules = enabledModuleConfigs.map((module) => module.id)
    const isEnabled = (id: LiveModuleConfig["id"]) => enabledModules.includes(id)
    return {
      garage: {
        id: source.garage.id,
        siteName: live.siteName,
        slogan: live.slogan,
        logo: clone(live.logo),
        address: clone(source.garage.address),
        contact: clone(live.contact),
        socialLinks: clone(live.socialLinks),
      },
      theme: clone(live.theme),
      navigation: getNavigation(),
      hero: getHeroContent(),
      collections: isEnabled("catalog") ? getVisibleCollections() : [],
      featuredVehicles: isEnabled("catalog") ? getFeaturedVehicles() : [],
      services: isEnabled("services") ? getVisibleServices() : [],
      enabledModules,
    }
  }

  return {
    getGarageConfig,
    getHeroVehicle,
    getHeroContent,
    getFeaturedVehicles,
    getVisibleCollections,
    getVisibleServices,
    getPublicVehicleSlugs,
    getVehicleDetailBySlug,
    getNavigation,
    getLiveHomepage,
  }
}

const defaultEngine = createLiveEngine({ garage, vehicles, collections, services })

export const getGarageConfig = defaultEngine.getGarageConfig
export const getHeroVehicle = defaultEngine.getHeroVehicle
export const getHeroContent = defaultEngine.getHeroContent
export const getFeaturedVehicles = defaultEngine.getFeaturedVehicles
export const getVisibleCollections = defaultEngine.getVisibleCollections
export const getVisibleServices = defaultEngine.getVisibleServices
export const getPublicVehicleSlugs = defaultEngine.getPublicVehicleSlugs
export const getVehicleDetailBySlug = defaultEngine.getVehicleDetailBySlug
export const getLiveHomepage = defaultEngine.getLiveHomepage
