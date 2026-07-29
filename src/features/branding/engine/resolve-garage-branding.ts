import type { GarageBranding, GarageBrandingRecord } from "../types"

export type GarageBrandingFallbacks = {
  readonly themeKey: string
  readonly countryCode: string
}

const DEFAULT_FALLBACKS: GarageBrandingFallbacks = {
  themeKey: "default",
  countryCode: "FR",
}

function text(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function url(value: string | null | undefined) {
  const normalized = text(value)
  if (!normalized) return null
  try {
    const parsed = new URL(normalized)
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null
  } catch {
    return null
  }
}

function color(value: string | null | undefined) {
  const normalized = text(value)
  return normalized && /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : null
}

function storagePath(value: string | null | undefined) {
  const normalized = text(value)?.replace(/^\/+/, "") ?? null
  return normalized && !normalized.includes("..") && !/^https?:\/\//i.test(normalized) ? normalized : null
}

function themeKey(value: string | null | undefined, fallback: string) {
  const normalized = text(value)
  return normalized && /^[a-z0-9][a-z0-9-]{0,49}$/.test(normalized) ? normalized : fallback
}

export function resolveGarageBranding({
  garage,
  record,
  fallbacks = DEFAULT_FALLBACKS,
}: {
  readonly garage: { readonly id: string; readonly name: string }
  readonly record: GarageBrandingRecord | null
  readonly fallbacks?: GarageBrandingFallbacks
}): GarageBranding {
  const displayName = text(record?.display_name) ?? text(garage.name) ?? "Garage"
  const countryCode = text(record?.country_code)?.toUpperCase()

  return {
    garageId: garage.id,
    displayName,
    legalName: text(record?.legal_name),
    logoPath: storagePath(record?.logo_path),
    faviconPath: storagePath(record?.favicon_path),
    contact: {
      phone: text(record?.phone),
      email: text(record?.email)?.toLowerCase() ?? null,
      websiteUrl: url(record?.website_url),
    },
    address: {
      line1: text(record?.address_line1),
      line2: text(record?.address_line2),
      postalCode: text(record?.postal_code),
      city: text(record?.city),
      countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : fallbacks.countryCode,
    },
    shortDescription: text(record?.short_description),
    socialLinks: {
      facebookUrl: url(record?.facebook_url),
      instagramUrl: url(record?.instagram_url),
    },
    themeKey: themeKey(record?.theme_key, fallbacks.themeKey),
    colors: {
      primary: color(record?.primary_color),
      secondary: color(record?.secondary_color),
      accent: color(record?.accent_color),
    },
  }
}
