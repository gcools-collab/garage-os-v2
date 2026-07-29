export type GarageBrandingContact = {
  readonly phone: string | null
  readonly email: string | null
  readonly websiteUrl: string | null
}

export type GarageBrandingAddress = {
  readonly line1: string | null
  readonly line2: string | null
  readonly postalCode: string | null
  readonly city: string | null
  readonly countryCode: string
}

export type GarageBrandingSocialLinks = {
  readonly facebookUrl: string | null
  readonly instagramUrl: string | null
}

export type GarageBrandingColors = {
  readonly primary: string | null
  readonly secondary: string | null
  readonly accent: string | null
}

export type GarageBranding = {
  readonly garageId: string
  readonly displayName: string
  readonly legalName: string | null
  readonly logoPath: string | null
  readonly faviconPath: string | null
  readonly contact: GarageBrandingContact
  readonly address: GarageBrandingAddress
  readonly shortDescription: string | null
  readonly socialLinks: GarageBrandingSocialLinks
  readonly themeKey: string
  readonly colors: GarageBrandingColors
}

export type GarageBrandingRecord = {
  readonly garage_id: string
  readonly display_name: string | null
  readonly legal_name: string | null
  readonly logo_path: string | null
  readonly favicon_path: string | null
  readonly phone: string | null
  readonly email: string | null
  readonly website_url: string | null
  readonly address_line1: string | null
  readonly address_line2: string | null
  readonly postal_code: string | null
  readonly city: string | null
  readonly country_code: string | null
  readonly short_description: string | null
  readonly facebook_url: string | null
  readonly instagram_url: string | null
  readonly theme_key: string | null
  readonly primary_color: string | null
  readonly secondary_color: string | null
  readonly accent_color: string | null
}

export type GarageBrandingUpdateInput = {
  readonly displayName: string
  readonly legalName?: string | null
  readonly phone?: string | null
  readonly email?: string | null
  readonly websiteUrl?: string | null
  readonly addressLine1?: string | null
  readonly addressLine2?: string | null
  readonly postalCode?: string | null
  readonly city?: string | null
  readonly countryCode?: string | null
  readonly shortDescription?: string | null
  readonly facebookUrl?: string | null
  readonly instagramUrl?: string | null
  readonly themeKey?: string | null
  readonly primaryColor?: string | null
  readonly secondaryColor?: string | null
  readonly accentColor?: string | null
}

export type GarageBrandingUpdateResult =
  | { readonly success: true; readonly branding: GarageBranding }
  | {
    readonly success: false
    readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_GARAGE" | "FORBIDDEN" | "VALIDATION_ERROR" | "DATABASE_ERROR"
    readonly message: string
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>
  }

export type ActiveGarageBranding = {
  readonly branding: GarageBranding
  readonly canEdit: boolean
}
