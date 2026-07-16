export type MarketSearchCriteria = {
  brand: string
  model: string
  trim?: string
  yearFrom?: number
  yearTo?: number
  mileageFrom?: number
  mileageTo?: number
  priceFrom?: number
  priceTo?: number
  fuel?: string
  gearbox?: string
  powerDinFrom?: number
  powerDinTo?: number
  location?: string
  limit?: number
}
