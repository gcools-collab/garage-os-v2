export type MarketSellerType = "PROFESSIONAL" | "PRIVATE" | "UNKNOWN"

export type MarketListing = {
  providerId: string
  externalId: string
  url: string | null
  title: string
  brand: string
  model: string
  trim: string | null
  year: number | null
  mileage: number | null
  fuel: string | null
  gearbox: string | null
  powerDin: number | null
  price: number
  currency: string
  location: string | null
  sellerType: MarketSellerType
  publishedAt: string | null
  imageUrls: string[]
  favoriteCount: number | null
}
