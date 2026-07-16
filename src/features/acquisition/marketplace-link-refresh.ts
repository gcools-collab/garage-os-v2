import type { DraftVehicle } from "./types"

export type ExistingMarketplaceLink = {
  publishedAt: string | null
  vehicleStatus: string
  vehicleSellingPrice: number | string | null
}

export type MarketplaceRefreshPlan = {
  link: {
    status: "ACTIVE"
    advertised_price: number | null
    favorite_count: number | null
    published_at: string | null
    last_seen_at: string
  }
  vehicleSellingPrice: number | null
  publishVehicle: boolean
}

export function requireAccessibleMarketplaceLink<T>(link: T | null): T {
  if (!link) throw new Error("Annonce introuvable ou inaccessible.")
  return link
}

export function buildMarketplaceRefreshPlan(
  existing: ExistingMarketplaceLink,
  draft: DraftVehicle,
  observedAt: Date
): MarketplaceRefreshPlan {
  const refreshedPublishedAt =
    draft.publishedAt && !Number.isNaN(Date.parse(draft.publishedAt))
      ? new Date(draft.publishedAt).toISOString()
      : existing.publishedAt

  return {
    link: {
      status: "ACTIVE",
      advertised_price: draft.advertisedPrice,
      favorite_count: draft.favoriteCount,
      published_at: refreshedPublishedAt,
      last_seen_at: observedAt.toISOString(),
    },
    vehicleSellingPrice:
      existing.vehicleSellingPrice == null ? draft.advertisedPrice : null,
    publishVehicle: existing.vehicleStatus === "PURCHASED",
  }
}
