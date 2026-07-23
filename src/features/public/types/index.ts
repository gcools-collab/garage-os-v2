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
  year: number
  mileage: number
  fuel: string
  gearbox: string
  sellingPrice?: number
  description?: string
  images: VehicleImage[]
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

export type HeroContent = {
  mode: HeroMode
  eyebrow?: string
  title: string
  description?: string
  primaryAction?: NavigationItem
  secondaryAction?: NavigationItem
  vehicle: Vehicle | null
  trustItems: TrustItem[]
}

export type FeaturedVehicleOptions = {
  limit?: number
  collectionId?: string
  includeUnavailable?: boolean
}

export type VisibleCollection = Collection & {
  availableVehicleCount: number
  resolvedCoverImageUrl: string
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
  featuredVehicles: Vehicle[]
  services: Service[]
  enabledModules: LiveModuleId[]
}

export type LiveEngineData = {
  garage: GarageConfig
  vehicles: readonly Vehicle[]
  collections: readonly Collection[]
  services: readonly Service[]
}
