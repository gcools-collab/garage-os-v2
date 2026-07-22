import type { VehicleStatus } from "../status/vehicle-status"
import type { MarketplaceLinkStatus } from "../marketplace-status"

export type StockVehicleImage = {
  url: string | null
  is_primary: boolean
  created_at: string
}

export type StockMarketplaceLink = {
  status: MarketplaceLinkStatus
  published_at: string | null
  provider: string
}

export type StockVehicle = {
  id: string
  brand: string
  model: string
  version: string | null
  trim: string | null
  year: number | null
  mileage: number | null
  status: VehicleStatus
  purchase_price: number | string | null
  selling_price: number | string | null
  vin: string | null
  registration_number: string | null
  fuel: string | null
  gearbox: string | null
  color: string | null
  description: string | null
  power_din: number | null
  fiscal_power: number | null
  doors: number | null
  seats: number | null
  first_registration_date: string | null
  body_type: string | null
  upholstery: string | null
  crit_air: number | null
  created_at: string
  vehicle_costs: Array<{ amount: number | string | null }> | null
  vehicle_images: StockVehicleImage[] | null
  marketplace_links: StockMarketplaceLink[] | null
  completeness: number
}

export type StockStatusCounts = {
  all: number
  PREPARATION: number
  PUBLISHED: number
  RESERVED: number
  SOLD: number
}

export type StockPageData = {
  vehicles: StockVehicle[]
  totalFiltered: number
  page: number
  pageCount: number
  pageSize: number
  counts: StockStatusCounts
}
