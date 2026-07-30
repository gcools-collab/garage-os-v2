import { resolveLiveTheme } from "@/features/theme"
import type { PublicGarageContext, PublicGarageRecord } from "../types"

function publicStorageUrl(bucket: string, path: string | null) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base || !path) return null
  return `${base}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`
}

export function mapPublicGarage(record: PublicGarageRecord): PublicGarageContext {
  const logoUrl = publicStorageUrl("garage-branding", record.logo_path)
  const faviconUrl = publicStorageUrl("garage-branding", record.favicon_path)
  const colors = {
    primary: record.primary_color,
    secondary: record.secondary_color,
    accent: record.accent_color,
  }
  return {
    garageId: record.garage_id,
    garageSlug: record.live_slug,
    displayName: record.display_name,
    status: record.live_enabled ? "ACTIVE" : "DISABLED",
    basePath: `/g/${encodeURIComponent(record.live_slug)}`,
    liveTheme: resolveLiveTheme({ themeKey: record.theme_key, colors }),
    branding: {
      displayName: record.display_name,
      legalName: null,
      logoUrl,
      faviconUrl,
      phone: record.phone,
      formattedPhone: record.phone,
      email: record.email,
      formattedAddress: [
        record.address_line1,
        record.address_line2,
        [record.postal_code, record.city].filter(Boolean).join(" "),
      ].filter(Boolean).join(", ") || null,
      shortDescription: record.short_description,
      socialLinks: {
        facebookUrl: record.facebook_url,
        instagramUrl: record.instagram_url,
      },
      themeKey: record.theme_key,
      colors,
    },
  }
}
