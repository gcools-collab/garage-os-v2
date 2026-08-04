import type { LiveThemeDefinition } from "@/features/theme"
import type { PublicServiceViewModel } from "../services"

export interface PublicNavigationItemViewModel {
  readonly label: string
  readonly href: string
  readonly children?: readonly PublicNavigationItemViewModel[]
}

export interface GaragePublicViewModel {
  readonly slug: string
  readonly name: string
  readonly logoUrl: string | null
  readonly description: string
  readonly phone: string | null
  readonly email: string | null
  readonly address: string | null
  readonly socialLinks: readonly PublicNavigationItemViewModel[]
  readonly openingHours: readonly string[]
  readonly homeHref: string
  readonly navigation: readonly PublicNavigationItemViewModel[]
  readonly services: readonly PublicServiceViewModel[]
  readonly theme: LiveThemeDefinition
}

export interface VehiclePublicCardViewModel {
  readonly id: string
  readonly slug: string
  readonly href: string
  readonly name: string
  readonly version: string | null
  readonly image: { readonly url: string; readonly alt: string } | null
  readonly price: string
  readonly year: string
  readonly mileage: string
  readonly fuel: string
  readonly gearbox: string
  readonly bodyType: string
  readonly badges: readonly string[]
  readonly futureCapabilities: readonly ("360" | "VIRTUAL_TOUR" | "COMPARE" | "FAVORITE")[]
}

export interface PublicHeroViewModel {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly image: { readonly url: string; readonly alt: string } | null
  readonly primaryAction: PublicNavigationItemViewModel
  readonly secondaryAction: PublicNavigationItemViewModel | null
}

export interface PublicHomepageSectionViewModel {
  readonly id: "SEARCH" | "FEATURED" | "LATEST" | "WHY_US" | "SERVICES" | "FINANCING" | "TRADE_IN" | "REVIEWS" | "CONTACT"
  readonly enabled: boolean
  readonly title: string
  readonly description: string
}

export interface PublicHomepageViewModel {
  readonly garage: GaragePublicViewModel
  readonly hero: PublicHeroViewModel
  readonly sections: readonly PublicHomepageSectionViewModel[]
  readonly vehicleCount: number
  readonly featuredVehicles: readonly VehiclePublicCardViewModel[]
  readonly latestVehicles: readonly VehiclePublicCardViewModel[]
  readonly quickSearch: {
    readonly action: string
    readonly brands: readonly string[]
    readonly models: readonly string[]
    readonly fuels: readonly string[]
    readonly gearboxes: readonly string[]
    readonly years: readonly string[]
  }
}

export type PublicStockSort = "newest" | "price-asc" | "price-desc" | "year-desc" | "mileage-asc"

export interface PublicStockQuery {
  readonly brand?: string
  readonly model?: string
  readonly fuel?: string
  readonly gearbox?: string
  readonly bodyType?: string
  readonly minPrice?: number
  readonly maxPrice?: number
  readonly minYear?: number
  readonly maxMileage?: number
  readonly sort?: PublicStockSort
  readonly page?: number
}

export interface PublicStockViewModel {
  readonly garage: GaragePublicViewModel
  readonly title: string
  readonly description: string
  readonly vehicles: readonly VehiclePublicCardViewModel[]
  readonly resultLabel: string
  readonly filters: {
    readonly action: string
    readonly values: PublicStockQuery
    readonly brands: readonly string[]
    readonly models: readonly string[]
    readonly fuels: readonly string[]
    readonly gearboxes: readonly string[]
    readonly bodyTypes: readonly string[]
  }
  readonly pagination: {
    readonly page: number
    readonly totalPages: number
    readonly previousHref: string | null
    readonly nextHref: string | null
  }
  readonly emptyMessage: string | null
}

export interface PublicContactViewModel {
  readonly garage: GaragePublicViewModel
  readonly title: string
  readonly description: string
  readonly phoneHref: string | null
  readonly emailHref: string | null
  readonly mapLabel: string
  readonly journeys: readonly PublicNavigationItemViewModel[]
  readonly form: {
    readonly fields: readonly { readonly name: string; readonly label: string; readonly type: "text" | "email" | "tel" | "textarea" }[]
    readonly submitLabel: string
  }
}

export interface PublicServicesPageViewModel {
  readonly garage: GaragePublicViewModel
  readonly title: string
  readonly description: string
  readonly services: readonly PublicServiceViewModel[]
}

export interface PublicProgramPageViewModel {
  readonly garage: GaragePublicViewModel
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly benefits: readonly string[]
  readonly action: PublicNavigationItemViewModel
}

export interface PublicSeoViewModel {
  readonly title: string
  readonly description: string
  readonly canonicalPath: string
  readonly openGraphImage: string | null
  readonly structuredData: Readonly<Record<string, unknown>>
}
