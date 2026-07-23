import { collections, garage, services, vehicles } from "../data"
import { buildCatalogHref } from "./catalog-query"
import type {
  FeaturedVehicleOptions,
  GarageConfig,
  HeroContent,
  LiveEngineData,
  LiveHomepage,
  LiveModuleConfig,
  LiveContactAction,
  LiveVehicleCard,
  LiveCatalogFilterOption,
  LiveCatalogSort,
  LiveVehicleCatalog,
  LiveVehicleCatalogQuery,
  LiveVehicleDescription,
  LiveVehicleDetail,
  LiveVehicleEquipmentGroup,
  LiveVehicleMetadataItem,
  LiveVehicleSpecificationGroup,
  LiveVehicleTrustItem,
  NavigationItem,
  Service,
  Vehicle,
  VisibleCollection,
} from "../types"

const DEFAULT_FEATURED_LIMIT = 6
const SIMILAR_VEHICLE_LIMIT = 3
const CATALOG_PAGE_SIZE = 12

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

function cleanText(value?: string) {
  const cleaned = value?.replace(/\s+/g, " ").trim()
  return cleaned || undefined
}

function uniqueCleanItems(items: readonly string[], limit?: number) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const cleaned = cleanText(item)
    const key = cleaned?.toLocaleLowerCase("fr-FR")
    if (!cleaned || !key || seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
    if (limit !== undefined && result.length >= limit) break
  }
  return result
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

  function prepareContactActions(): LiveContactAction[] {
    const contact = source.garage.live.contact
    const phone = contact.phone?.replace(/[^\d+]/g, "")
    const email = contact.email?.trim()
    const whatsapp = contact.whatsapp?.replace(/\D/g, "")
    const actions = [
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
    ].filter((action): action is NonNullable<typeof action> => action !== null)
    return actions.map((action, index) => ({
      ...action,
      variant: index === 0 ? "primary" : "secondary",
    }))
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

  function prepareVehicleCard(vehicle: Vehicle): LiveVehicleCard {
    const prepared = prepareVehicle(vehicle)
    return {
      id: prepared.id,
      slug: prepared.slug,
      displayName: [prepared.brand, prepared.model, prepared.trim]
        .map(cleanText)
        .filter(Boolean)
        .join(" "),
      image: prepared.displayImage ? clone(prepared.displayImage) : null,
      price: prepared.sellingPrice ?? null,
      metadata: prepareDetailMetadata(prepared).filter((item) => item.id !== "trim"),
      badge: prepared.featured
        ? { label: "Coup de cœur", icon: "heart" }
        : undefined,
      href: `/vehicles/${encodeURIComponent(prepared.slug)}`,
    }
  }

  function prepareDescription(vehicle: Vehicle): LiveVehicleDescription {
    return {
      introduction: cleanText(vehicle.description),
      highlights: uniqueCleanItems(vehicle.highlights ?? [], 6),
    }
  }

  function prepareSpecifications(vehicle: Vehicle): LiveVehicleSpecificationGroup[] {
    const formatNumber = (value: number) => new Intl.NumberFormat("fr-FR").format(value)
    const formatDate = (value?: string) => {
      const cleaned = cleanText(value)
      if (!cleaned) return undefined
      const date = new Date(`${cleaned}T00:00:00`)
      return Number.isNaN(date.getTime())
        ? undefined
        : new Intl.DateTimeFormat("fr-FR").format(date)
    }
    const firstRegistrationDate = formatDate(vehicle.firstRegistrationDate)
    const groups: LiveVehicleSpecificationGroup[] = [
      {
        id: "general",
        title: "Informations générales",
        items: [
          vehicle.year ? { label: "Année", value: String(vehicle.year) } : null,
          vehicle.mileage !== undefined
            ? { label: "Kilométrage", value: `${formatNumber(vehicle.mileage)} km` }
            : null,
          cleanText(vehicle.exteriorColor)
            ? { label: "Couleur extérieure", value: cleanText(vehicle.exteriorColor)! }
            : null,
          cleanText(vehicle.interiorColor)
            ? { label: "Couleur intérieure", value: cleanText(vehicle.interiorColor)! }
            : null,
        ].filter((item): item is { label: string; value: string } => item !== null),
      },
      {
        id: "engine",
        title: "Motorisation",
        items: [
          cleanText(vehicle.fuel)
            ? { label: "Carburant", value: cleanText(vehicle.fuel)! }
            : null,
          cleanText(vehicle.gearbox)
            ? { label: "Boîte de vitesses", value: cleanText(vehicle.gearbox)! }
            : null,
          vehicle.dinPower !== undefined
            ? { label: "Puissance DIN", value: `${formatNumber(vehicle.dinPower)} ch` }
            : null,
          vehicle.fiscalPower !== undefined
            ? { label: "Puissance fiscale", value: `${formatNumber(vehicle.fiscalPower)} CV` }
            : null,
          vehicle.displacement !== undefined
            ? { label: "Cylindrée", value: `${formatNumber(vehicle.displacement)} cm³` }
            : null,
          vehicle.co2Emissions !== undefined
            ? { label: "Émissions CO₂", value: `${formatNumber(vehicle.co2Emissions)} g/km` }
            : null,
        ].filter((item): item is { label: string; value: string } => item !== null),
      },
      {
        id: "capacity",
        title: "Dimensions et capacité",
        items: [
          vehicle.doors !== undefined
            ? { label: "Portes", value: String(vehicle.doors) }
            : null,
          vehicle.seats !== undefined
            ? { label: "Places", value: String(vehicle.seats) }
            : null,
        ].filter((item): item is { label: string; value: string } => item !== null),
      },
      {
        id: "administrative",
        title: "Historique administratif",
        items: [
          firstRegistrationDate
            ? {
                label: "Première mise en circulation",
                value: firstRegistrationDate,
              }
            : null,
          vehicle.ownersCount !== undefined
            ? { label: "Nombre de propriétaires", value: String(vehicle.ownersCount) }
            : null,
          cleanText(vehicle.euroStandard)
            ? { label: "Norme Euro", value: cleanText(vehicle.euroStandard)! }
            : null,
          cleanText(vehicle.critAir)
            ? { label: "Crit’Air", value: cleanText(vehicle.critAir)! }
            : null,
          cleanText(vehicle.reference)
            ? { label: "Référence", value: cleanText(vehicle.reference)! }
            : null,
        ].filter((item): item is { label: string; value: string } => item !== null),
      },
    ]
    return groups.filter((group) => group.items.length > 0)
  }

  function prepareEquipment(vehicle: Vehicle): LiveVehicleEquipmentGroup[] {
    return (vehicle.equipmentGroups ?? [])
      .map((group) => ({
        id: group.id,
        title: cleanText(group.label) ?? "",
        items: uniqueCleanItems(group.items),
      }))
      .filter((group) => group.title && group.items.length > 0)
  }

  function prepareTrustItems(): LiveVehicleTrustItem[] {
    return source.garage.live.vehicleTrustItems
      .filter((item) => item.enabled)
      .flatMap((item) => {
        const title = cleanText(item.title)
        const description = cleanText(item.description)
        return title && description
          ? [{ id: item.id, icon: item.icon, title, description }]
          : []
      })
      .map(clone)
  }

  function getSimilarVehicles(vehicleId: string): LiveVehicleCard[] {
    const current = source.vehicles.find((vehicle) => vehicle.id === vehicleId)
    if (!current) return []
    const currentCollections = new Set(current.collectionIds)
    const currentPrice = current.sellingPrice
    return source.vehicles
      .filter((vehicle) => vehicle.id !== current.id && isPubliclyAvailable(vehicle))
      .map((vehicle) => {
        let score = 0
        if (vehicle.collectionIds.some((id) => currentCollections.has(id))) score += 100
        if (vehicle.brand === current.brand) score += 40
        if (
          currentPrice !== undefined &&
          vehicle.sellingPrice !== undefined &&
          Math.abs(vehicle.sellingPrice - currentPrice) / currentPrice <= 0.25
        ) score += 20
        if (vehicle.featured) score += 10
        return { vehicle, score }
      })
      .sort(
        (first, second) =>
          second.score - first.score ||
          Date.parse(second.vehicle.addedAt) - Date.parse(first.vehicle.addedAt) ||
          first.vehicle.id.localeCompare(second.vehicle.id)
      )
      .slice(0, SIMILAR_VEHICLE_LIMIT)
      .map(({ vehicle }) => prepareVehicleCard(vehicle))
  }

  function getVehicleCatalog(
    requestedQuery: LiveVehicleCatalogQuery = {}
  ): LiveVehicleCatalog {
    const availableVehicles = source.vehicles.filter(isPubliclyAvailable)
    const optionList = (select: (vehicle: Vehicle) => string | undefined) => {
      const counts = new Map<string, { label: string; count: number }>()
      for (const vehicle of availableVehicles) {
        const label = cleanText(select(vehicle))
        if (!label) continue
        const key = label.toLocaleLowerCase("fr-FR")
        const current = counts.get(key)
        counts.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 })
      }
      return [...counts.values()]
        .sort((first, second) => first.label.localeCompare(second.label, "fr-FR"))
        .map(({ label, count }): LiveCatalogFilterOption => ({ value: label, label, count }))
    }
    const brands = optionList((vehicle) => vehicle.brand)
    const fuels = optionList((vehicle) => vehicle.fuel)
    const gearboxes = optionList((vehicle) => vehicle.gearbox)
    const validCollection = source.collections.find(
      (collection) => collection.active && collection.slug === cleanText(requestedQuery.collection)
    )
    const findOption = (options: LiveCatalogFilterOption[], value?: string) =>
      options.find((option) => option.value.toLocaleLowerCase("fr-FR") === cleanText(value)?.toLocaleLowerCase("fr-FR"))
    const brand = findOption(brands, requestedQuery.brand)?.value
    const fuel = findOption(fuels, requestedQuery.fuel)?.value
    const gearbox = findOption(gearboxes, requestedQuery.gearbox)?.value
    const minPrice = requestedQuery.minPrice !== undefined && requestedQuery.minPrice >= 0
      ? requestedQuery.minPrice
      : undefined
    const maxPrice = requestedQuery.maxPrice !== undefined && requestedQuery.maxPrice >= 0
      ? requestedQuery.maxPrice
      : undefined
    const normalizedMinPrice =
      minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice
        ? undefined
        : minPrice
    const sorts: LiveCatalogSort[] = ["recommended", "price-asc", "price-desc", "newest", "mileage-asc"]
    const sort = sorts.includes(requestedQuery.sort ?? "recommended")
      ? requestedQuery.sort ?? "recommended"
      : "recommended"
    const query: LiveVehicleCatalogQuery = {
      collection: validCollection?.slug,
      brand,
      fuel,
      gearbox,
      minPrice: normalizedMinPrice,
      maxPrice,
      sort,
    }
    let matching = availableVehicles.filter((vehicle) => {
      if (validCollection && !vehicle.collectionIds.includes(validCollection.id)) return false
      if (brand && vehicle.brand.toLocaleLowerCase("fr-FR") !== brand.toLocaleLowerCase("fr-FR")) return false
      if (fuel && vehicle.fuel?.toLocaleLowerCase("fr-FR") !== fuel.toLocaleLowerCase("fr-FR")) return false
      if (gearbox && vehicle.gearbox?.toLocaleLowerCase("fr-FR") !== gearbox.toLocaleLowerCase("fr-FR")) return false
      if (normalizedMinPrice !== undefined && (vehicle.sellingPrice === undefined || vehicle.sellingPrice < normalizedMinPrice)) return false
      if (maxPrice !== undefined && (vehicle.sellingPrice === undefined || vehicle.sellingPrice > maxPrice)) return false
      return true
    })
    const nullableNumber = (
      first: number | undefined,
      second: number | undefined,
      direction = 1
    ) => first === undefined
      ? second === undefined ? 0 : 1
      : second === undefined ? -1 : (first - second) * direction
    matching = [...matching].sort((first, second) => {
      if (sort === "price-asc") return nullableNumber(first.sellingPrice, second.sellingPrice) || first.id.localeCompare(second.id)
      if (sort === "price-desc") return nullableNumber(first.sellingPrice, second.sellingPrice, -1) || first.id.localeCompare(second.id)
      if (sort === "newest") return Date.parse(second.addedAt) - Date.parse(first.addedAt) || first.id.localeCompare(second.id)
      if (sort === "mileage-asc") return nullableNumber(first.mileage, second.mileage) || first.id.localeCompare(second.id)
      return byVehiclePriority(first, second)
    })
    const totalItems = matching.length
    const totalPages = Math.max(1, Math.ceil(totalItems / CATALOG_PAGE_SIZE))
    const requestedPage = requestedQuery.page && requestedQuery.page >= 1
      ? Math.floor(requestedQuery.page)
      : 1
    const page = Math.min(requestedPage, totalPages)
    query.page = page > 1 ? page : undefined
    const vehicles = matching
      .slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE)
      .map(prepareVehicleCard)
    const activeFilters = [
      validCollection
        ? { id: "collection", label: "Collection", value: validCollection.name, removeHref: buildCatalogHref(query, { collection: undefined, page: undefined }) }
        : null,
      brand ? { id: "brand", label: "Marque", value: brand, removeHref: buildCatalogHref(query, { brand: undefined, page: undefined }) } : null,
      fuel ? { id: "fuel", label: "Carburant", value: fuel, removeHref: buildCatalogHref(query, { fuel: undefined, page: undefined }) } : null,
      gearbox ? { id: "gearbox", label: "Boîte", value: gearbox, removeHref: buildCatalogHref(query, { gearbox: undefined, page: undefined }) } : null,
      normalizedMinPrice !== undefined ? { id: "minPrice", label: "Prix minimum", value: `${new Intl.NumberFormat("fr-FR").format(normalizedMinPrice)} €`, removeHref: buildCatalogHref(query, { minPrice: undefined, page: undefined }) } : null,
      maxPrice !== undefined ? { id: "maxPrice", label: "Prix maximum", value: `${new Intl.NumberFormat("fr-FR").format(maxPrice)} €`, removeHref: buildCatalogHref(query, { maxPrice: undefined, page: undefined }) } : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null)
    const technicalFilter = Boolean(brand || fuel || gearbox || normalizedMinPrice !== undefined || maxPrice !== undefined || sort !== "recommended" || page > 1)
    const collectionTitle = validCollection ? `Collection ${validCollection.name}` : "Tous nos véhicules"
    const collectionDescription = cleanText(validCollection?.description) ?? "Découvrez les véhicules actuellement disponibles."
    const canonicalPath = validCollection
      ? buildCatalogHref({ collection: validCollection.slug }, {})
      : "/vehicles"
    const sortLabels: Record<LiveCatalogSort, string> = {
      recommended: "Recommandés",
      "price-asc": "Prix croissant",
      "price-desc": "Prix décroissant",
      newest: "Plus récents",
      "mileage-asc": "Kilométrage croissant",
    }
    const prices = availableVehicles.flatMap((vehicle) => vehicle.sellingPrice === undefined ? [] : [vehicle.sellingPrice])
    return {
      heading: {
        eyebrow: validCollection ? "Collection" : "Catalogue",
        title: collectionTitle,
        description: collectionDescription,
        breadcrumbs: [
          { id: "home", label: "Accueil", href: "/" },
          { id: "vehicles", label: "Véhicules", href: "/vehicles" },
          ...(validCollection ? [{ id: "collection", label: validCollection.name, href: canonicalPath }] : []),
        ],
      },
      vehicles,
      filters: {
        brands,
        fuels,
        gearboxes,
        priceRange: {
          min: prices.length ? Math.min(...prices) : null,
          max: prices.length ? Math.max(...prices) : null,
        },
        sortOptions: sorts.map((value) => ({
          value,
          label: sortLabels[value],
          href: buildCatalogHref(query, { sort: value, page: undefined }),
        })),
        formValues: { collection: validCollection?.slug, brand, fuel, gearbox, minPrice: normalizedMinPrice, maxPrice, sort },
        resetHref: "/vehicles",
      },
      activeFilters,
      resultCount: totalItems,
      emptyState: totalItems === 0 ? {
        title: "Aucun véhicule ne correspond à vos critères",
        description: "Essayez de modifier ou de supprimer certains filtres.",
        resetHref: activeFilters.length ? "/vehicles" : undefined,
      } : null,
      pagination: {
        page,
        pageSize: CATALOG_PAGE_SIZE,
        totalItems,
        totalPages,
        previousHref: page > 1 ? buildCatalogHref(query, { page: page - 1 }) : null,
        nextHref: page < totalPages ? buildCatalogHref(query, { page: page + 1 }) : null,
      },
      seo: {
        title: `${collectionTitle} | ${source.garage.live.siteName}`,
        description: collectionDescription,
        canonicalPath,
        noIndex: technicalFilter,
      },
    }
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

  function getFeaturedVehicles(options: FeaturedVehicleOptions = {}): LiveVehicleCard[] {
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
        .map(prepareVehicleCard)
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
          catalogHref: buildCatalogHref({ collection: collection.slug }, {}),
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
      subtitle: cleanText(vehicle.trim),
      price: vehicle.sellingPrice ?? null,
      images,
      primaryImage: images[0] ?? null,
      metadata: prepareDetailMetadata(vehicle),
      status: vehicle.available ? "available" : "unavailable",
      contactActions: prepareContactActions(),
      description: prepareDescription(vehicle),
      specifications: prepareSpecifications(vehicle),
      equipmentGroups: prepareEquipment(vehicle),
      trustItems: prepareTrustItems(),
      similarVehicles: getSimilarVehicles(vehicle.id),
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
    getSimilarVehicles,
    getVehicleCatalog,
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
export const getSimilarVehicles = defaultEngine.getSimilarVehicles
export const getVehicleCatalog = defaultEngine.getVehicleCatalog
export const getLiveHomepage = defaultEngine.getLiveHomepage
