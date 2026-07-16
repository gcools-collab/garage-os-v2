import type { MarketProvider } from "../market-provider"
import type { MarketListing, MarketSearchCriteria } from "../../types"
import { mapLeboncoinListing } from "./mapper"
import type {
  LeboncoinClient,
  LeboncoinSearchRequest,
} from "./types"

function toRange(
  minimum: number | undefined,
  maximum: number | undefined
): readonly [number | null, number | null] | undefined {
  if (minimum === undefined && maximum === undefined) return undefined
  return [minimum ?? null, maximum ?? null]
}

function toLeboncoinSearchRequest(
  criteria: MarketSearchCriteria
): LeboncoinSearchRequest {
  return {
    text: [criteria.brand, criteria.model, criteria.trim]
      .filter((value): value is string => Boolean(value))
      .join(" "),
    category: "VEHICULES_VOITURES",
    limit: criteria.limit,
    price: toRange(criteria.priceFrom, criteria.priceTo),
    mileage: toRange(criteria.mileageFrom, criteria.mileageTo),
    registrationYear: toRange(criteria.yearFrom, criteria.yearTo),
    fuel: criteria.fuel,
    gearbox: criteria.gearbox,
    powerDin: toRange(criteria.powerDinFrom, criteria.powerDinTo),
    location: criteria.location,
  }
}

function extractListingId(url: string) {
  let pathname: string

  try {
    pathname = new URL(url).pathname
  } catch {
    throw new Error("Invalid Leboncoin listing URL.")
  }

  const listingId = pathname.match(/(?:^|\/)(\d{6,})(?:\.htm)?\/?$/)?.[1]
  if (!listingId) {
    throw new Error("Unable to extract a Leboncoin listing ID from the URL.")
  }

  return listingId
}

export class LeboncoinProvider implements MarketProvider {
  readonly id = "leboncoin"

  constructor(private readonly client: LeboncoinClient) {}

  async search(criteria: MarketSearchCriteria): Promise<MarketListing[]> {
    const listings = await this.client.search(toLeboncoinSearchRequest(criteria))
    return listings.map(mapLeboncoinListing)
  }

  async getListing(url: string): Promise<MarketListing> {
    const listing = await this.client.getListing(extractListingId(url))
    return mapLeboncoinListing(listing)
  }
}
