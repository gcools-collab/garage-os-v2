import type { GarageBrandingColors, GarageBrandingSocialLinks } from "./garage-branding"

export type GarageBrandingShellViewModel = {
  readonly displayName: string
  readonly logoUrl: string | null
  readonly subtitle: string
  readonly initials: string
  readonly themeKey: string
}

export type GarageLiveBrandingViewModel = {
  readonly displayName: string
  readonly legalName: string | null
  readonly logoUrl: string | null
  readonly faviconUrl: string | null
  readonly phone: string | null
  readonly formattedPhone: string | null
  readonly email: string | null
  readonly formattedAddress: string | null
  readonly shortDescription: string | null
  readonly socialLinks: GarageBrandingSocialLinks
  readonly themeKey: string
  readonly colors: GarageBrandingColors
}

export type GarageBrandingSettingsViewModel = {
  readonly title: string
  readonly description: string
  readonly canEdit: boolean
  readonly readOnlyMessage: string | null
  readonly values: {
    readonly displayName: string
    readonly legalName: string
    readonly phone: string
    readonly email: string
    readonly websiteUrl: string
    readonly addressLine1: string
    readonly addressLine2: string
    readonly postalCode: string
    readonly city: string
    readonly countryCode: string
    readonly shortDescription: string
    readonly facebookUrl: string
    readonly instagramUrl: string
    readonly themeKey: string
    readonly primaryColor: string
    readonly secondaryColor: string
    readonly accentColor: string
  }
}
