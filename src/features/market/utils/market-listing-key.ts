import type { MarketListing } from "../types"

export function getMarketListingKey(
  listing: Pick<MarketListing, "providerId" | "externalId">
) {
  return `${listing.providerId}:${listing.externalId}`
}
