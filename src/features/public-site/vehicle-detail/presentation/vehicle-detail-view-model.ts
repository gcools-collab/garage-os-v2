import type {
  AssetGalleryViewModel,
  AssetImageViewModel,
  AssetPlaceholderViewModel,
  AssetSeoViewModel,
} from "@/features/media"
import type { GaragePublicViewModel, PublicNavigationItemViewModel } from "../../types"

export interface VehicleHeroViewModel {
  readonly eyebrow: string
  readonly title: string
  readonly version: string | null
  readonly price: string
  readonly availabilityLabel: string
  readonly cover: AssetImageViewModel | null
  readonly metadata: readonly { readonly label: string; readonly value: string }[]
}

export interface VehicleSpecificationViewModel {
  readonly label: string
  readonly value: string
}

export interface VehicleCTASectionViewModel {
  readonly title: string
  readonly description: string
  readonly primary: PublicNavigationItemViewModel
  readonly secondary: PublicNavigationItemViewModel | null
  readonly tertiary: PublicNavigationItemViewModel | null
}

export interface VehicleTrustViewModel {
  readonly title: string
  readonly items: readonly { readonly id: string; readonly title: string; readonly description: string }[]
}

export interface VehicleDetailSeoViewModel {
  readonly title: string
  readonly description: string
  readonly canonicalPath: string
  readonly openGraphImage: string | null
  readonly twitterImage: string | null
  readonly breadcrumbJsonLd: Readonly<Record<string, unknown>>
  readonly vehicleJsonLd: Readonly<Record<string, unknown>>
  readonly imageJsonLd: AssetSeoViewModel | null
  readonly localBusinessJsonLd: Readonly<Record<string, unknown>>
}

export interface VehicleDetailPageViewModel {
  readonly garage: GaragePublicViewModel
  readonly breadcrumbs: readonly PublicNavigationItemViewModel[]
  readonly hero: VehicleHeroViewModel
  readonly gallery: AssetGalleryViewModel | AssetPlaceholderViewModel
  readonly galleryCapabilities: {
    readonly navigation: "CONTRACT"
    readonly fullscreen: "CONTRACT"
    readonly zoom: "CONTRACT"
    readonly threeSixty: "PLACEHOLDER"
    readonly video: "PLACEHOLDER"
  }
  readonly commercialSummary: readonly string[]
  readonly pricing: {
    readonly mainPrice: string
    readonly vatLabel: string | null
  }
  readonly cta: VehicleCTASectionViewModel
  readonly specifications: readonly VehicleSpecificationViewModel[]
  readonly description: {
    readonly sellerDescription: string | null
    readonly highlights: readonly string[]
    readonly observations: readonly string[]
  }
  readonly equipmentGroups: readonly {
    readonly id: string
    readonly title: string
    readonly items: readonly string[]
  }[]
  readonly history: readonly { readonly date: string; readonly label: string }[]
  readonly services: readonly {
    readonly id: string
    readonly title: string
    readonly description: string
    readonly href: string
  }[]
  readonly trust: VehicleTrustViewModel
  readonly location: {
    readonly garageName: string
    readonly address: string | null
    readonly openingHours: readonly string[]
    readonly distanceLabel: string
    readonly mapLabel: string
  }
  readonly futureModules: readonly {
    readonly id: "360" | "VIDEO" | "HOTSPOTS" | "COMPARE" | "FAVORITE" | "CARVERTICAL" | "AI" | "MARKET" | "INSPECTION"
    readonly enabled: false
  }[]
  readonly seo: VehicleDetailSeoViewModel
}
