import type { MarketListing, MarketMatch, MarketSearchCriteria } from "../types"
import type { MatchingEngine } from "./matching-engine"
import { modelsAreComparable, normalizeVehicleIdentity } from "./model-family"

const MINIMUM_SCORE = 65
const normalize = normalizeVehicleIdentity

function tokenSimilarity(left?: string, right?: string | null) {
  const a = new Set(normalize(left).split(" ").filter(Boolean))
  const b = new Set(normalize(right).split(" ").filter(Boolean))
  if (!a.size || !b.size) return 0
  return [...a].filter((token) => b.has(token)).length / Math.max(a.size, b.size)
}

export class DeterministicMatchingEngine implements MatchingEngine {
  async match(criteria: MarketSearchCriteria, listings: readonly MarketListing[]): Promise<MarketMatch[]> {
    return listings.flatMap((listing) => {
      if (normalize(listing.brand) !== normalize(criteria.brand)) return []
      if (!modelsAreComparable(
        { brand: criteria.brand, model: criteria.model },
        { brand: listing.brand, model: listing.model, title: listing.title }
      )) return []
      if (!Number.isFinite(listing.price) || listing.price <= 0) return []

      let score = 50
      const reasons = ["Marque et modèle identiques"]
      if (listing.year !== null) {
        const targetYear = ((criteria.yearFrom ?? listing.year) + (criteria.yearTo ?? listing.year)) / 2
        const yearGap = Math.abs(listing.year - targetYear)
        if (yearGap <= 2) { score += yearGap < 0.5 ? 15 : yearGap <= 1 ? 12 : 8; reasons.push(`Année proche (${listing.year})`) }
      }
      if (listing.mileage !== null) {
        const targetMileage = ((criteria.mileageFrom ?? listing.mileage) + (criteria.mileageTo ?? listing.mileage)) / 2
        const mileageGap = Math.abs(listing.mileage - targetMileage)
        if (mileageGap <= 30_000) { score += mileageGap <= 10_000 ? 15 : mileageGap <= 20_000 ? 10 : 5; reasons.push("Kilométrage comparable") }
      }
      if (criteria.fuel && normalize(listing.fuel) === normalize(criteria.fuel)) { score += 10; reasons.push("Même carburant") }
      if (criteria.gearbox && normalize(listing.gearbox) === normalize(criteria.gearbox)) { score += 5; reasons.push("Même boîte") }
      const targetPower = criteria.powerDinFrom && criteria.powerDinTo ? (criteria.powerDinFrom + criteria.powerDinTo) / 2 : null
      if (targetPower && listing.powerDin) { const ratio = Math.abs(listing.powerDin - targetPower) / targetPower; if (ratio <= 0.2) { score += ratio <= 0.1 ? 5 : 3; reasons.push("Puissance proche") } }
      const trimScore = tokenSimilarity(criteria.trim, listing.trim)
      if (trimScore > 0) { score += Math.round(trimScore * 5); reasons.push("Finition proche") }
      return score >= MINIMUM_SCORE ? [{ listing, score: Math.min(100, score), reasons }] : []
    }).sort((a, b) => b.score - a.score)
  }
}
