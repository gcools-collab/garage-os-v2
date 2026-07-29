import type { MarketHealth, MarketOpportunity, MarketPricePosition, MarketWarning } from "./market-types"

export function prepareWarnings(count: number, position: MarketPricePosition): MarketWarning[] {
  if (!count) return ["NO_COMPARABLE", "NOT_ENOUGH_DATA"]
  return [
    ...(count < 4 ? ["NOT_ENOUGH_DATA" as const] : []),
    ...(position === "OVER_MARKET" ? ["PRICE_TOO_HIGH" as const] : []),
    ...(position === "UNDER_MARKET" ? ["PRICE_TOO_LOW" as const] : []),
  ]
}

export function prepareOpportunities(position: MarketPricePosition, health: MarketHealth): MarketOpportunity[] {
  return [
    ...(position === "OVER_MARKET" ? ["BAISSE_PRIX" as const] : []),
    ...(position === "UNDER_MARKET" ? ["HAUSSE_PRIX" as const] : []),
    ...(position === "MARKET" ? ["BON_PRIX" as const] : []),
    ...(health === "SLOW" ? ["MARCHE_FAIBLE" as const] : []),
    ...(health === "HOT" ? ["MARCHE_FORT" as const] : []),
  ]
}
