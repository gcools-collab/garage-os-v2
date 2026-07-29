import { createBrandingInitials } from "../engine"
import type {
  GarageBranding,
  GarageBrandingSettingsViewModel,
  GarageBrandingShellViewModel,
  GarageLiveBrandingViewModel,
} from "../types"

export type GarageBrandingMedia = {
  readonly logoUrl: string | null
  readonly faviconUrl: string | null
}

function formatPhone(phone: string | null) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim()
  return phone
}

function formatAddress(branding: GarageBranding) {
  const cityLine = [branding.address.postalCode, branding.address.city].filter(Boolean).join(" ")
  const parts = [branding.address.line1, branding.address.line2, cityLine || null].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

export function buildGarageBrandingShellViewModel(
  branding: GarageBranding,
  media: GarageBrandingMedia
): GarageBrandingShellViewModel {
  return {
    displayName: branding.displayName,
    logoUrl: media.logoUrl,
    subtitle: "Propulsé par Garage OS",
    initials: createBrandingInitials(branding.displayName),
    themeKey: branding.themeKey,
  }
}

export function buildGarageLiveBrandingViewModel(
  branding: GarageBranding,
  media: GarageBrandingMedia
): GarageLiveBrandingViewModel {
  return {
    displayName: branding.displayName,
    legalName: branding.legalName,
    logoUrl: media.logoUrl,
    faviconUrl: media.faviconUrl,
    phone: branding.contact.phone,
    formattedPhone: formatPhone(branding.contact.phone),
    email: branding.contact.email,
    formattedAddress: formatAddress(branding),
    shortDescription: branding.shortDescription,
    socialLinks: branding.socialLinks,
    themeKey: branding.themeKey,
    colors: branding.colors,
  }
}

export function buildGarageBrandingSettingsViewModel({
  branding,
  canEdit,
}: {
  readonly branding: GarageBranding
  readonly canEdit: boolean
}): GarageBrandingSettingsViewModel {
  return {
    title: "Identité du garage",
    description: "Gérez les informations utilisées dans Garage OS et sur votre futur site public.",
    canEdit,
    readOnlyMessage: canEdit ? null : "Seuls les propriétaires et administrateurs peuvent modifier le branding.",
    values: {
      displayName: branding.displayName,
      legalName: branding.legalName ?? "",
      phone: branding.contact.phone ?? "",
      email: branding.contact.email ?? "",
      websiteUrl: branding.contact.websiteUrl ?? "",
      addressLine1: branding.address.line1 ?? "",
      addressLine2: branding.address.line2 ?? "",
      postalCode: branding.address.postalCode ?? "",
      city: branding.address.city ?? "",
      countryCode: branding.address.countryCode,
      shortDescription: branding.shortDescription ?? "",
      facebookUrl: branding.socialLinks.facebookUrl ?? "",
      instagramUrl: branding.socialLinks.instagramUrl ?? "",
      themeKey: branding.themeKey,
      primaryColor: branding.colors.primary ?? "",
      secondaryColor: branding.colors.secondary ?? "",
      accentColor: branding.colors.accent ?? "",
    },
  }
}
