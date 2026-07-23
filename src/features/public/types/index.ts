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

export type HeroConfig = {
  eyebrow?: string
  title: string
  description?: string
  primaryAction?: NavigationItem
  secondaryAction?: NavigationItem
  featuredVehicleId?: string
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

export type GarageConfig = {
  id: string
  name: string
  tagline?: string
  description?: string
  logoUrl?: string
  contact: GarageContact
  address: GarageAddress
  navigation: NavigationItem[]
  hero: HeroConfig
  themeId: Theme["id"]
  socialLinks?: NavigationItem[]
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
  featured: boolean
  collectionIds: string[]
}

export type Collection = {
  id: string
  slug: string
  name: string
  description?: string
  vehicleIds: string[]
  coverImageUrl?: string
  order: number
}

export type Service = {
  id: string
  slug: string
  name: string
  description: string
  icon?: string
  order: number
}
