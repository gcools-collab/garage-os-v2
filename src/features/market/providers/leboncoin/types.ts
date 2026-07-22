export type LeboncoinAttribute = {
  key: string
  keyLabel: string | null
  value: string | null
  valueLabel: string | null
  values: string[]
  valuesLabel: string[]
}

export type LeboncoinLocation = {
  city: string | null
  cityLabel: string | null
  zipcode: string | null
  departmentName: string | null
  regionName: string | null
}

export type LeboncoinOwnerType = "professional" | "private" | "unknown"

export type LeboncoinListing = {
  id: string
  subject: string
  body: string | null
  brand: string | null
  model: string | null
  url: string
  price: number | null
  images: string[]
  attributes: Record<string, LeboncoinAttribute>
  location: LeboncoinLocation | null
  ownerType: LeboncoinOwnerType
  firstPublicationDate: string | null
  favoriteCount: number | null
}

export type LeboncoinSearchRequest = {
  brand: string
  model: string
  text: string
  category: "VEHICULES_VOITURES"
  limit?: number
  price?: readonly [number | null, number | null]
  mileage?: readonly [number | null, number | null]
  registrationYear?: readonly [number | null, number | null]
  fuel?: string
  gearbox?: string
  powerDin?: readonly [number | null, number | null]
  location?: string
}

/**
 * Port implemented by a Python sidecar around lbc-finder/lbc.
 * Keeping it injected makes this provider independent from Next.js and HTTP.
 */
export interface LeboncoinClient {
  search(request: LeboncoinSearchRequest): Promise<LeboncoinListing[]>
  getListing(listingId: string): Promise<LeboncoinListing>
}
