export type ThemeColorTokens = {
  background: string
  foreground: string
  surface: string
  surfaceForeground: string
  primary: string
  primaryForeground: string
  muted: string
  mutedForeground: string
  border: string
}

export type Theme = {
  id: string
  name: string
  colors: ThemeColorTokens
  typography: {
    fontFamily: string
    headingWeight: number
    bodyWeight: number
  }
  radius: {
    card: string
    control: string
  }
  layout: {
    contentMaxWidth: string
  }
}

export type NavigationItem = {
  id: string
  label: string
  href: string
  external?: boolean
  children?: NavigationItem[]
}

export type LiveModuleId =
  | "catalog"
  | "services"
  | "tradeIn"
  | "financing"
  | "contact"
  | "about"
  | "reviews"

export type LiveModuleConfig = {
  id: LiveModuleId
  enabled: boolean
  navigation: NavigationItem | null
  order: number
}

export type HeroMode = "vehicle" | "editorial" | "fallback"
export type HeroSelectionMode = "auto" | "editorial"

export type TrustItem = {
  id: string
  label: string
}

export type HeroConfig = {
  mode: HeroSelectionMode
  eyebrow?: string
  title: string
  description?: string
  primaryAction?: NavigationItem
  secondaryAction?: NavigationItem
  vehicleId?: string
  trustItems: TrustItem[]
}

export type GarageContact = {
  phone?: string
  email?: string
  whatsapp?: string
  website?: string
}

export type GarageAddress = {
  street?: string
  postalCode: string
  city: string
  country: string
}

export type GarageLogo = {
  url: string
  alt: string
}

export type LiveSiteConfig = {
  enabled: boolean
  siteName: string
  slogan?: string
  logo?: GarageLogo
  theme: Theme
  modules: LiveModuleConfig[]
  hero: HeroConfig
  contact: GarageContact
  socialLinks: NavigationItem[]
  collectionFallbackImageUrl: string
  vehicleFallbackImageUrl: string
  vehicleTrustItems: VehicleTrustItemConfig[]
}

export type GarageConfig = {
  id: string
  address: GarageAddress
  live: LiveSiteConfig
}

export type VehicleImage = {
  id: string
  url: string
  alt: string
  isPrimary: boolean
}

export type Vehicle = {
  id: string
  slug: string
  brand: string
  model: string
  trim?: string
  year?: number
  mileage?: number
  fuel?: string
  gearbox?: string
  sellingPrice?: number
  description?: string
  highlights?: string[]
  fiscalPower?: number
  dinPower?: number
  displacement?: number
  co2Emissions?: number
  doors?: number
  seats?: number
  exteriorColor?: string
  interiorColor?: string
  firstRegistrationDate?: string
  ownersCount?: number
  euroStandard?: string
  critAir?: string
  reference?: string
  equipmentGroups?: VehicleEquipmentGroup[]
  images: VehicleImage[]
  displayImage?: VehicleImage | null
  public: boolean
  available: boolean
  featured: boolean
  featuredPriority: number
  addedAt: string
  collectionIds: string[]
}

export type Collection = {
  id: string
  slug: string
  name: string
  description?: string
  vehicleIds: string[]
  coverImageUrl?: string
  active: boolean
  order: number
}

export type Service = {
  id: string
  slug: string
  name: string
  description: string
  icon?: string
  active: boolean
  public: boolean
  featured: boolean
  order: number
}

type HeroContentBase = {
  eyebrow?: string
  title: string
  description?: string
  primaryAction?: NavigationItem
  secondaryAction?: NavigationItem
  trustItems: TrustItem[]
}

export type HeroContent =
  | (HeroContentBase & { mode: "vehicle"; vehicle: Vehicle })
  | (HeroContentBase & { mode: "editorial"; vehicle: null })
  | (HeroContentBase & { mode: "fallback"; vehicle: null })

export type FeaturedVehicleOptions = {
  limit?: number
  collectionId?: string
  includeUnavailable?: boolean
}

export type VisibleCollection = Collection & {
  availableVehicleCount: number
  resolvedCoverImageUrl: string
  catalogHref: string
}

export type LiveGarageViewModel = {
  id: string
  siteName: string
  slogan?: string
  logo?: GarageLogo
  address: GarageAddress
  contact: GarageContact
  socialLinks: NavigationItem[]
}

export type LiveHomepage = {
  garage: LiveGarageViewModel
  theme: Theme
  navigation: NavigationItem[]
  hero: HeroContent
  collections: VisibleCollection[]
  featuredVehicles: LiveVehicleCard[]
  services: Service[]
  enabledModules: LiveModuleId[]
}

export type LiveEngineData = {
  garage: GarageConfig
  vehicles: readonly Vehicle[]
  collections: readonly Collection[]
  services: readonly Service[]
}

export type LiveVehicleStatus = "available" | "reserved" | "unavailable"

export type LiveVehicleMetadataItem = {
  id: "year" | "mileage" | "fuel" | "gearbox" | "trim"
  label: string
  value: string
}

export type VehicleEquipmentGroup = {
  id: string
  label: string
  items: string[]
}

export type LiveTrustIcon =
  | "shield"
  | "inspection"
  | "trade-in"
  | "delivery"
  | "history"
  | "support"

export type VehicleTrustItemConfig = {
  id: string
  enabled: boolean
  icon: LiveTrustIcon
  title: string
  description: string
}

export type LiveContactAction = NavigationItem & {
  variant: "primary" | "secondary"
}

export type LiveVehicleDescription = {
  introduction?: string
  highlights: string[]
}

export type LiveVehicleSpecificationItem = {
  label: string
  value: string
}

export type LiveVehicleSpecificationGroup = {
  id: string
  title: string
  items: LiveVehicleSpecificationItem[]
}

export type LiveVehicleEquipmentGroup = {
  id: string
  title: string
  items: string[]
}

export type LiveVehicleTrustItem = {
  id: string
  title: string
  description: string
  icon: LiveTrustIcon
}

export type LiveVehicleBadge = {
  label: string
  icon: "heart"
}

export type LiveVehicleCard = {
  id: string
  slug: string
  displayName: string
  image: VehicleImage | null
  price: number | null
  metadata: LiveVehicleMetadataItem[]
  badge?: LiveVehicleBadge
  href: string
}

export type LiveCatalogSort =
  | "recommended"
  | "price-asc"
  | "price-desc"
  | "newest"
  | "mileage-asc"

export type LiveVehicleCatalogQuery = {
  q?: string
  collection?: string
  brand?: string
  fuel?: string
  gearbox?: string
  minPrice?: number
  maxPrice?: number
  sort?: LiveCatalogSort
  page?: number
}

export type LiveCatalogFilterOption = {
  value: string
  label: string
  count: number
  selected: boolean
  disabled: boolean
}

export type LiveCatalogActiveFilter = {
  id: string
  label: string
  value: string
  removeHref: string
}

export type LiveVehicleCatalog = {
  heading: {
    eyebrow: string
    title: string
    description: string
    breadcrumbs: NavigationItem[]
  }
  vehicles: LiveVehicleCard[]
  filters: {
    collections: LiveCatalogFilterOption[]
    brands: LiveCatalogFilterOption[]
    fuels: LiveCatalogFilterOption[]
    gearboxes: LiveCatalogFilterOption[]
    priceRange: {
      availableMin: number | null
      availableMax: number | null
      selectedMin?: number
      selectedMax?: number
    }
    sortOptions: Array<{ value: LiveCatalogSort; label: string; href: string }>
    formValues: {
      collection?: string
      brand?: string
      fuel?: string
      gearbox?: string
      minPrice?: number
      maxPrice?: number
      sort: LiveCatalogSort
    }
    resetHref: string
  }
  activeFilters: LiveCatalogActiveFilter[]
  activeFilterCount: number
  search: {
    value: string
    placeholder: string
    submitLabel: string
    clearHref: string | null
    preservedParams: Array<{ name: string; value: string }>
  }
  resultSummary: string
  suggestions: Array<{ label: string; href: string }>
  resultCount: number
  emptyState: { title: string; description: string; resetHref?: string } | null
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    previousHref: string | null
    nextHref: string | null
  }
  seo: {
    title: string
    description: string
    canonicalPath: string
    noIndex: boolean
  }
}

export type LiveVehicleDetail = {
  vehicle: Vehicle
  displayName: string
  subtitle?: string
  price: number | null
  images: VehicleImage[]
  primaryImage: VehicleImage | null
  metadata: LiveVehicleMetadataItem[]
  status: LiveVehicleStatus
  contactActions: LiveContactAction[]
  description: LiveVehicleDescription
  specifications: LiveVehicleSpecificationGroup[]
  equipmentGroups: LiveVehicleEquipmentGroup[]
  trustItems: LiveVehicleTrustItem[]
  similarVehicles: LiveVehicleCard[]
  seo: {
    title: string
    description: string
  }
}
