import type { MetadataRoute } from "next"
import { getPublicSitemapEntries } from "@/features/live-stock"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "")
  const entries = await getPublicSitemapEntries()
  return entries.flatMap((entry) => {
    const garagePath = `/g/${encodeURIComponent(entry.garageSlug)}`
    if (entry.vehicleSlug) {
      return [{
        url: `${baseUrl}${garagePath}/vehicles/${encodeURIComponent(entry.vehicleSlug)}`,
        lastModified: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
      }]
    }
    return [
      { url: `${baseUrl}${garagePath}` },
      { url: `${baseUrl}${garagePath}/vehicles` },
    ]
  })
}
