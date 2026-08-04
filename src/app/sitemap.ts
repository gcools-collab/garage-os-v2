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
        url: `${baseUrl}${garagePath}/vehicules/${encodeURIComponent(entry.vehicleSlug)}`,
        lastModified: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
      }]
    }
    const services = new Set(entry.serviceIds)
    return [
      { url: `${baseUrl}${garagePath}` },
      { url: `${baseUrl}${garagePath}/stock` },
      { url: `${baseUrl}${garagePath}/contact` },
      ...(services.size > 1 ? [{ url: `${baseUrl}${garagePath}/services` }] : []),
      ...(services.has("RENTAL") ? [{ url: `${baseUrl}${garagePath}/location` }] : []),
      ...(services.has("CONSIGNMENT") ? [{ url: `${baseUrl}${garagePath}/depot-vente` }] : []),
      { url: `${baseUrl}${garagePath}/mentions-legales` },
      { url: `${baseUrl}${garagePath}/politique-confidentialite` },
    ]
  })
}
