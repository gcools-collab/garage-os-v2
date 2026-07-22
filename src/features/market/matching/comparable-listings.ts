import type { MarketListing } from "../types"
import { normalizeVehicleIdentity } from "./model-family"

export type MarketplaceSourceIdentity = {
  providerId: string
  externalId: string | null
  url: string | null
  title?: string | null
  price?: number | null
  mileage?: number | null
  location?: string | null
}

function normalizedUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    url.hash = ""
    url.search = ""
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`
  } catch {
    return value.trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "")
  }
}

function fingerprint(values: { title?: string | null; price?: number | null; mileage?: number | null; location?: string | null }) {
  if (!values.title || values.price == null || values.mileage == null) return null
  return [normalizeVehicleIdentity(values.title), values.price, values.mileage, normalizeVehicleIdentity(values.location)].join("|")
}

function sourceFallbackFingerprint(values: { title?: string | null; price?: number | null; mileage?: number | null }) {
  if (!values.title || values.price == null || values.mileage == null) return null
  return [normalizeVehicleIdentity(values.title), values.price, values.mileage].join("|")
}

function isSourceListing(listing: MarketListing, sources: readonly MarketplaceSourceIdentity[]) {
  return sources.some((source) => {
    if (source.providerId !== listing.providerId) return false
    if (source.externalId && listing.externalId && source.externalId === listing.externalId) return true
    const sourceUrl = normalizedUrl(source.url)
    const listingUrl = normalizedUrl(listing.url)
    if (sourceUrl && listingUrl && sourceUrl === listingUrl) return true
    if (!source.externalId && !sourceUrl) {
      const sourceFingerprint = sourceFallbackFingerprint(source)
      return sourceFingerprint !== null && sourceFingerprint === sourceFallbackFingerprint(listing)
    }
    return false
  })
}

export function prepareComparableListings(
  listings: readonly MarketListing[],
  sources: readonly MarketplaceSourceIdentity[] = []
): MarketListing[] {
  const seen = new Set<string>()
  return listings.filter((listing) => {
    if (isSourceListing(listing, sources)) return false
    const externalKey = listing.externalId ? `${listing.providerId}:id:${listing.externalId}` : null
    const urlKey = normalizedUrl(listing.url)
    const functionalKey = fingerprint(listing)
    const keys = [externalKey, urlKey ? `${listing.providerId}:url:${urlKey}` : null, functionalKey ? `${listing.providerId}:fp:${functionalKey}` : null].filter((key): key is string => key !== null)
    if (keys.some((key) => seen.has(key))) return false
    keys.forEach((key) => seen.add(key))
    return true
  })
}
