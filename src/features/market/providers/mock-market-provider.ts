import type { MarketListing, MarketSearchCriteria } from "../types"
import type { MarketProvider } from "./market-provider"

const MOCK_LISTINGS: MarketListing[] = [
  {
    providerId: "mock",
    externalId: "mock-001",
    url: null,
    title: "Peugeot 308 Allure PureTech 130",
    brand: "Peugeot",
    model: "308",
    trim: "Allure",
    year: 2021,
    mileage: 48_000,
    fuel: "Essence",
    gearbox: "Automatique",
    powerDin: 130,
    price: 18_490,
    currency: "EUR",
    location: "Lyon",
    sellerType: "PROFESSIONAL",
    publishedAt: "2026-07-12T09:00:00.000Z",
    imageUrls: [],
    favoriteCount: null,
  },
  {
    providerId: "mock",
    externalId: "mock-002",
    url: null,
    title: "Peugeot 308 GT BlueHDi 130",
    brand: "Peugeot",
    model: "308",
    trim: "GT",
    year: 2022,
    mileage: 61_500,
    fuel: "Diesel",
    gearbox: "Automatique",
    powerDin: 130,
    price: 21_900,
    currency: "EUR",
    location: "Paris",
    sellerType: "PROFESSIONAL",
    publishedAt: "2026-07-14T14:30:00.000Z",
    imageUrls: [],
    favoriteCount: null,
  },
  {
    providerId: "mock",
    externalId: "mock-003",
    url: null,
    title: "Renault Clio Intens TCe 90",
    brand: "Renault",
    model: "Clio",
    trim: "Intens",
    year: 2020,
    mileage: 72_000,
    fuel: "Essence",
    gearbox: "Manuelle",
    powerDin: 90,
    price: 13_250,
    currency: "EUR",
    location: "Bordeaux",
    sellerType: "PRIVATE",
    publishedAt: "2026-07-10T17:15:00.000Z",
    imageUrls: [],
    favoriteCount: null,
  },
]

function includesNormalized(value: string | null, expected: string) {
  return value?.toLocaleLowerCase("fr").includes(
    expected.toLocaleLowerCase("fr")
  ) ?? false
}

export class MockMarketProvider implements MarketProvider {
  readonly id = "mock"

  async search(criteria: MarketSearchCriteria): Promise<MarketListing[]> {
    const listings = MOCK_LISTINGS.filter((listing) => {
      if (!includesNormalized(listing.brand, criteria.brand)) return false
      if (!includesNormalized(listing.model, criteria.model)) return false
      if (criteria.trim && !includesNormalized(listing.trim, criteria.trim)) {
        return false
      }
      if (criteria.yearFrom !== undefined && listing.year < criteria.yearFrom) {
        return false
      }
      if (criteria.yearTo !== undefined && listing.year > criteria.yearTo) {
        return false
      }
      if (
        criteria.mileageFrom !== undefined &&
        listing.mileage < criteria.mileageFrom
      ) {
        return false
      }
      if (
        criteria.mileageTo !== undefined &&
        listing.mileage > criteria.mileageTo
      ) {
        return false
      }
      if (criteria.priceFrom !== undefined && listing.price < criteria.priceFrom) {
        return false
      }
      if (criteria.priceTo !== undefined && listing.price > criteria.priceTo) {
        return false
      }
      if (criteria.fuel && !includesNormalized(listing.fuel, criteria.fuel)) {
        return false
      }
      if (
        criteria.gearbox &&
        !includesNormalized(listing.gearbox, criteria.gearbox)
      ) {
        return false
      }
      if (
        criteria.powerDinFrom !== undefined &&
        (listing.powerDin === null || listing.powerDin < criteria.powerDinFrom)
      ) {
        return false
      }
      if (
        criteria.powerDinTo !== undefined &&
        (listing.powerDin === null || listing.powerDin > criteria.powerDinTo)
      ) {
        return false
      }
      if (
        criteria.location &&
        !includesNormalized(listing.location, criteria.location)
      ) {
        return false
      }

      return true
    })

    return listings.slice(0, criteria.limit).map((listing) => ({
      ...listing,
      imageUrls: [...listing.imageUrls],
    }))
  }
}
