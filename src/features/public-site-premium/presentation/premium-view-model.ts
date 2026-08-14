import type { GaragePublicViewModel, PublicNavigationItemViewModel, VehiclePublicCardViewModel } from "@/features/public-site/types"

export interface PremiumSectionHeadingViewModel { readonly eyebrow: string; readonly title: string; readonly description: string }
export interface PremiumFeatureViewModel { readonly id: string; readonly title: string; readonly description: string; readonly icon: "SHIELD" | "HANDSHAKE" | "SPARKLES" | "CAR" | "WALLET" | "MAP"; readonly action?: PublicNavigationItemViewModel }
export interface PremiumHomepageViewModel {
  readonly garage: GaragePublicViewModel
  readonly hero: {
    readonly eyebrow: string; readonly title: string; readonly description: string
    readonly image: { readonly url: string; readonly alt: string } | null
    readonly actions: readonly PublicNavigationItemViewModel[]
  }
  readonly search: {
    readonly action: string
    readonly fields: readonly { readonly name: string; readonly label: string; readonly type: "select" | "number"; readonly options: readonly string[]; readonly placeholder: string }[]
    readonly submitLabel: string
  }
  readonly featured: { readonly heading: PremiumSectionHeadingViewModel; readonly vehicle: VehiclePublicCardViewModel | null }
  readonly latest: { readonly heading: PremiumSectionHeadingViewModel; readonly vehicles: readonly VehiclePublicCardViewModel[] }
  readonly services: { readonly heading: PremiumSectionHeadingViewModel; readonly items: readonly PremiumFeatureViewModel[] }
  readonly whyUs: { readonly heading: PremiumSectionHeadingViewModel; readonly items: readonly PremiumFeatureViewModel[] }
  readonly tradeIn: { readonly heading: PremiumSectionHeadingViewModel; readonly action: PublicNavigationItemViewModel }
  readonly reviews: { readonly heading: PremiumSectionHeadingViewModel; readonly available: false; readonly message: string }
  readonly metrics: readonly { readonly id: string; readonly value: string; readonly label: string }[]
  readonly primaryCta: { readonly title: string; readonly description: string; readonly actions: readonly PublicNavigationItemViewModel[] }
  readonly contact: { readonly title: string; readonly description: string; readonly phone: PublicNavigationItemViewModel | null; readonly email: PublicNavigationItemViewModel | null; readonly address: string | null; readonly action: PublicNavigationItemViewModel }
  readonly floatingCta: readonly { readonly id: "APPOINTMENT" | "CONTACT"; readonly label: string; readonly href: string; readonly enabled: boolean }[]
  readonly appointmentActions: readonly PublicNavigationItemViewModel[]
  readonly contactActions: readonly PublicNavigationItemViewModel[]
  readonly animation: { readonly reveal: "FADE_SLIDE"; readonly stagger: true; readonly reducedMotion: true }
}
