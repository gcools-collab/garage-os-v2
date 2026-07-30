import type {
  MarketProvider as LegacyMarketProvider,
  MarketSearchCriteria,
} from "@/features/market"
import {
  DeterministicMatchingEngine,
  prepareComparableListings,
} from "@/features/market/matching"
import { normalizeMarketplaceListing } from "../normalizers"
import type {
  AcquisitionMarketQuery,
  ComparableVehicle,
  MarketProvider,
} from "../types"

function criteria(query: AcquisitionMarketQuery): MarketSearchCriteria {
  return {
    brand: query.brand,
    model: query.model,
    trim: query.trim ?? undefined,
    yearFrom: query.year === null ? undefined : Math.max(1886, query.year - 3),
    yearTo: query.year === null ? undefined : query.year + 3,
    mileageFrom: query.mileage === null ? undefined : Math.max(0, query.mileage - 50_000),
    mileageTo: query.mileage === null ? undefined : query.mileage + 50_000,
    fuel: query.fuel ?? undefined,
    gearbox: query.gearbox ?? undefined,
    location: query.location ?? undefined,
    postalCode: query.postalCode ?? undefined,
    latitude: query.latitude ?? undefined,
    longitude: query.longitude ?? undefined,
    radiusKm: query.radiusKm ?? undefined,
    limit: query.limit,
  }
}

function differences(
  query: AcquisitionMarketQuery,
  listing: Awaited<ReturnType<LegacyMarketProvider["search"]>>[number]
): readonly string[] {
  const values: string[] = []
  if (query.year !== null && listing.year !== null && Math.abs(query.year - listing.year) > 1) {
    values.push(`Écart d’année : ${Math.abs(query.year - listing.year)} ans`)
  }
  if (query.mileage !== null && listing.mileage !== null &&
      Math.abs(query.mileage - listing.mileage) > 20_000) {
    values.push(`Écart de kilométrage : ${Math.abs(query.mileage - listing.mileage).toLocaleString("fr-FR")} km`)
  }
  if (query.fuel && listing.fuel &&
      query.fuel.toLowerCase() !== listing.fuel.toLowerCase()) {
    values.push("Énergie différente")
  }
  if (query.gearbox && listing.gearbox &&
      query.gearbox.toLowerCase() !== listing.gearbox.toLowerCase()) {
    values.push("Boîte différente")
  }
  if (listing.sellerType !== "UNKNOWN" && listing.sellerType !== query.sellerType) {
    values.push("Type de vendeur différent")
  }
  return values
}

export class MarketplaceProvider implements MarketProvider {
  readonly id = "marketplace"

  constructor(private readonly provider: LegacyMarketProvider) {}

  async search(
    query: AcquisitionMarketQuery,
    collectedAt: Date
  ): Promise<readonly ComparableVehicle[]> {
    const searchCriteria = criteria(query)
    const listings = await this.provider.search(searchCriteria)
    const prepared = prepareComparableListings(
      listings,
      query.excludedUrls.map((url) => ({ providerId: this.provider.id, externalId: null, url }))
    )
    const matches = await new DeterministicMatchingEngine().match(searchCriteria, prepared)
    return matches
      .filter((match) => match.score >= 65)
      .map((match) => normalizeMarketplaceListing(match.listing, collectedAt, {
        score: match.score,
        reasons: match.reasons,
        differences: differences(query, match.listing),
      }))
      .filter((item): item is ComparableVehicle => item !== null)
  }
}
