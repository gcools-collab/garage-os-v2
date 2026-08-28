import "server-only"

import { createClient } from "@/lib/supabase/server"
import type {
  GarageMarketDashboardRecord,
  PersistedMarketAnalysis,
} from "../types/market-dashboard-record"

const unavailableStatuses = ["SOLD", "DELIVERED", "ARCHIVED", "CANCELLED"] as const

type VehicleImageRow = {
  readonly url: string | null
  readonly is_primary: boolean
}

type MarketAnalysisRow = {
  readonly id: string
  readonly comparable_count: number
  readonly minimum_price: number | string | null
  readonly maximum_price: number | string | null
  readonly average_price: number | string | null
  readonly median_price: number | string | null
  readonly current_vehicle_price: number | string | null
  readonly price_difference: number | string | null
  readonly price_difference_percent: number | string | null
  readonly positioning: "BELOW_MARKET" | "IN_MARKET" | "ABOVE_MARKET" | null
  readonly analyzed_at: string
  readonly provider: string
}

type VehicleRow = {
  readonly id: string
  readonly brand: string
  readonly model: string
  readonly trim: string | null
  readonly year: number | null
  readonly mileage: number | null
  readonly fuel: string | null
  readonly gearbox: string | null
  readonly selling_price: number | string | null
  readonly vehicle_images: readonly VehicleImageRow[] | null
  readonly vehicle_market_analyses: readonly MarketAnalysisRow[] | null
}

function number(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function primaryImageUrl(images: readonly VehicleImageRow[] | null | undefined) {
  const rows = images ?? []
  return (
    rows.find((image) => image.is_primary)?.url ??
    rows.find((image) => image.url)?.url ??
    null
  )
}

function mapAnalysis(row: MarketAnalysisRow): PersistedMarketAnalysis {
  return {
    id: row.id,
    comparableCount: row.comparable_count,
    minimumPrice: number(row.minimum_price),
    maximumPrice: number(row.maximum_price),
    averagePrice: number(row.average_price),
    medianPrice: number(row.median_price),
    currentVehiclePrice: number(row.current_vehicle_price),
    priceDifference: number(row.price_difference),
    priceDifferencePercent: number(row.price_difference_percent),
    positioning: row.positioning,
    analyzedAt: row.analyzed_at,
    provider: row.provider,
  }
}

export async function getGarageMarketDashboardData(
  garageId: string
): Promise<GarageMarketDashboardRecord> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("vehicles")
    .select(`
      id, brand, model, trim, year, mileage, fuel, gearbox, selling_price, status,
      vehicle_images (url, is_primary),
      vehicle_market_analyses (
        id, comparable_count, minimum_price, maximum_price, average_price,
        median_price, current_vehicle_price, price_difference,
        price_difference_percent, positioning, analyzed_at, provider
      )
    `)
    .eq("garage_id", garageId)
    .not("status", "in", `(${unavailableStatuses.map((status) => `"${status}"`).join(",")})`)
    .order("created_at", { ascending: false })
    .order("analyzed_at", {
      referencedTable: "vehicle_market_analyses",
      ascending: false,
    })
    .limit(1, { referencedTable: "vehicle_market_analyses" })

  if (error) {
    throw new Error(`Lecture du stock marché impossible (${error.code}).`)
  }

  const vehicles = ((data ?? []) as unknown as VehicleRow[]).map((vehicle) => ({
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    trim: vehicle.trim,
    year: vehicle.year,
    mileage: vehicle.mileage,
    fuel: vehicle.fuel,
    gearbox: vehicle.gearbox,
    sellingPrice: number(vehicle.selling_price),
    primaryImageUrl: primaryImageUrl(vehicle.vehicle_images),
    analysis:
      vehicle.vehicle_market_analyses?.[0] != null
        ? mapAnalysis(vehicle.vehicle_market_analyses[0])
        : null,
  }))

  return { garageId, vehicles }
}
