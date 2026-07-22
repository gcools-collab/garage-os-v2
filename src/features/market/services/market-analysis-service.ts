import type { MarketMatch, MarketPricePosition, MarketStatistics } from "../types"

const round = (value: number) => Math.round(value * 100) / 100
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

export function calculateMarketStatistics(matches: readonly MarketMatch[], now = new Date()): MarketStatistics {
  const valid = matches.filter(({ listing }) => Number.isFinite(listing.price) && listing.price > 0)
  const prices = valid.map(({ listing }) => listing.price).sort((a, b) => a - b)
  const middle = Math.floor(prices.length / 2)
  const ages = valid.flatMap(({ listing }) => {
    if (!listing.publishedAt) return []
    const timestamp = new Date(listing.publishedAt).getTime()
    return Number.isFinite(timestamp) && timestamp <= now.getTime() ? [(now.getTime() - timestamp) / 86_400_000] : []
  })
  return {
    comparableCount: valid.length,
    minimumPrice: prices[0] ?? null,
    maximumPrice: prices.at(-1) ?? null,
    averagePrice: prices.length ? round(average(prices)!) : null,
    medianPrice: prices.length ? round(prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2) : null,
    averageMileage: (() => {
      const mileages = valid.flatMap(({ listing }) => listing.mileage === null ? [] : [listing.mileage])
      return mileages.length ? round(average(mileages)!) : null
    })(),
    averageListingAgeDays: ages.length ? round(average(ages)!) : null,
    professionalCount: valid.filter(({ listing }) => listing.sellerType === "PROFESSIONAL").length,
    privateCount: valid.filter(({ listing }) => listing.sellerType === "PRIVATE").length,
  }
}

export function calculateMarketPosition(currentPrice: number | null, medianPrice: number | null): MarketPricePosition | null {
  if (currentPrice === null || currentPrice < 0 || medianPrice === null || medianPrice <= 0) return null
  const difference = currentPrice - medianPrice
  const differencePercent = (difference / medianPrice) * 100
  return {
    currentPrice,
    difference: round(difference),
    differencePercent: round(differencePercent),
    positioning: differencePercent < -5 ? "BELOW_MARKET" : differencePercent > 5 ? "ABOVE_MARKET" : "IN_MARKET",
  }
}
