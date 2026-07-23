import { collections, garage, services, vehicles } from "../data"
import type {
  FeaturedVehicleOptions,
  GarageConfig,
  HeroContent,
  LiveEngineData,
  LiveHomepage,
  LiveModuleConfig,
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
    if (explicitVehicle) return clone(explicitVehicle)

    const featuredVehicle = eligibleVehicles
      .filter((vehicle) => vehicle.featured)
      .sort(byVehiclePriority)[0]
    if (featuredVehicle) return clone(featuredVehicle)

    const latestVehicle = eligibleVehicles.sort(
      (first, second) =>
        Date.parse(second.addedAt) - Date.parse(first.addedAt) ||
        first.id.localeCompare(second.id)
    )[0]
    return latestVehicle ? clone(latestVehicle) : null
  }

  function getHeroContent(): HeroContent {
    const config = source.garage.live.hero
    const vehicle =
      source.garage.live.enabled && config.mode !== "editorial"
        ? getHeroVehicle()
        : null
    return {
      mode:
        config.mode === "editorial"
          ? "editorial"
          : vehicle
            ? "vehicle"
            : "fallback",
      eyebrow: config.eyebrow,
      title: config.title,
      description: config.description,
      primaryAction: clone(config.primaryAction),
      secondaryAction: clone(config.secondaryAction),
      vehicle,
      trustItems: clone(config.trustItems),
    }
  }

  function getFeaturedVehicles(options: FeaturedVehicleOptions = {}): Vehicle[] {
    const limit = Math.max(0, options.limit ?? DEFAULT_FEATURED_LIMIT)
    return clone(
      source.vehicles
        .filter((vehicle) => vehicle.public)
        .filter((vehicle) => options.includeUnavailable || vehicle.available)
        .filter(
          (vehicle) =>
            !options.collectionId || vehicle.collectionIds.includes(options.collectionId)
        )
        .sort(byVehiclePriority)
        .slice(0, limit)
    )
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
export const getLiveHomepage = defaultEngine.getLiveHomepage
