import type { GarageLiveBrandingViewModel } from "@/features/branding"
import type { LiveThemeDefinition } from "@/features/theme"
import type { GarageServiceConfiguration } from "@/features/public-site/services"

export type VehiclePublicationStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED"

export type LiveVehiclePhoto = {
  readonly id: string
  readonly path: string
  readonly url: string
  readonly alt: string
  readonly position: number
  readonly isCover: boolean
  readonly width: number | null
  readonly height: number | null
}

export type LiveStockVehicle = {
  readonly id: string
  readonly garageId: string
  readonly slug: string
  readonly make: string
  readonly model: string
  readonly version: string | null
  readonly title: string
  readonly year: number | null
  readonly mileageKm: number | null
  readonly fuelType: string | null
  readonly transmission: string | null
  readonly bodyType: string | null
  readonly powerHp: number | null
  readonly fiscalPower: number | null
  readonly doors: number | null
  readonly seats: number | null
  readonly color: string | null
  readonly registrationDate: string | null
  readonly priceCents: number | null
  readonly previousPriceCents: number | null
  readonly description: string | null
  readonly equipment: readonly string[]
  readonly status: string
  readonly publicationStatus: VehiclePublicationStatus
  readonly publishedAt: string | null
  readonly soldAt: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly co2Emissions: number | null
  readonly critAir: number | null
  readonly euroStandard: string | null
  readonly ownersCount: number | null
  readonly photos: readonly LiveVehiclePhoto[]
  readonly hasExterior360?: boolean
  readonly hasInteriorTour?: boolean
}

export type PublicGarageContext = {
  readonly garageId: string
  readonly garageSlug: string
  readonly displayName: string
  readonly branding: GarageLiveBrandingViewModel
  readonly liveTheme: LiveThemeDefinition
  readonly status: "ACTIVE" | "DISABLED"
  readonly basePath: string
  readonly serviceConfigurations?: readonly GarageServiceConfiguration[]
}

export type PublicationValidation = {
  readonly canPublish: boolean
  readonly missingFields: readonly string[]
  readonly warnings: readonly string[]
}

export type PublicVehicleQuery = {
  readonly page?: number
  readonly pageSize?: number
}
