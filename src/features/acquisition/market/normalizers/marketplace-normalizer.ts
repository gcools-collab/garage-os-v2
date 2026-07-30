import type { MarketListing } from "@/features/market"
import type { ComparableVehicle } from "../types"

function quality(listing: MarketListing): number {
  const values = [
    listing.brand, listing.model, listing.year, listing.mileage, listing.fuel,
    listing.gearbox, listing.powerDin, listing.location, listing.publishedAt,
  ]
  return Math.round(values.filter((value) => value !== null && value !== "").length / values.length * 100)
}

export function normalizeMarketplaceListing(
  listing: MarketListing,
  collectedAt: Date,
  match?: {
    readonly score: number
    readonly reasons: readonly string[]
    readonly differences: readonly string[]
  }
): ComparableVehicle | null {
  if (!Number.isFinite(listing.price) || listing.price <= 0) return null
  const brand = listing.brand.trim()
  const model = listing.model.trim()
  if (!brand || !model) return null
  return {
    source: listing.providerId,
    externalId: listing.externalId,
    brand,
    model,
    trim: listing.trim,
    year: listing.year,
    mileage: listing.mileage,
    fuel: listing.fuel,
    gearbox: listing.gearbox,
    powerDin: listing.powerDin,
    advertisedPrice: listing.price,
    priceNature: "ASKING_PRICE",
    location: listing.location,
    sellerType: listing.sellerType,
    publishedAt: listing.publishedAt,
    collectedAt: collectedAt.toISOString(),
    url: listing.url,
    dataQuality: quality(listing),
    description: listing.description?.trim() || null,
    imageUrls: [...listing.imageUrls],
    similarityScore: match?.score ?? 0,
    matchedCriteria: match?.reasons ?? [],
    importantDifferences: match?.differences ?? [],
    selectionReason: match
      ? `Comparable retenu avec un score de similarité de ${match.score}/100.`
      : "Comparable normalisé sans score de matching.",
  }
}
