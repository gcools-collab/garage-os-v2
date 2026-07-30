import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type { IntelligenceRecommendationRecord } from "../types"

export type IntelligenceVehicleRow = {
  readonly id: string
  readonly garage_id: string
  readonly live_slug: string | null
  readonly brand: string
  readonly model: string
  readonly trim: string | null
  readonly version: string | null
  readonly status: string
  readonly publication_status: string
  readonly selling_price: number | string | null
  readonly purchase_price: number | string | null
  readonly description: string | null
  readonly year: number | null
  readonly mileage: number | null
  readonly fuel: string | null
  readonly gearbox: string | null
  readonly vin: string | null
  readonly registration_number: string | null
  readonly created_at: string
  readonly updated_at: string
  readonly published_at: string | null
}

export type IntelligenceCostRow = {
  readonly vehicle_id: string
  readonly amount: number | string
}

export type IntelligenceImageRow = {
  readonly vehicle_id: string
  readonly type: string
}

export type IntelligenceMarketRow = {
  readonly vehicle_id: string
  readonly comparable_count: number
  readonly minimum_price: number | string | null
  readonly maximum_price: number | string | null
  readonly average_price: number | string | null
  readonly median_price: number | string | null
  readonly price_difference: number | string | null
  readonly price_difference_percent: number | string | null
  readonly analyzed_at: string
}

export type IntelligenceLeadRow = {
  readonly id: string
  readonly vehicle_id: string | null
  readonly customer_name: string
  readonly vehicle_title_snapshot: string | null
  readonly status: string
  readonly type: string
  readonly created_at: string
  readonly first_contacted_at: string | null
  readonly last_contacted_at: string | null
  readonly preferred_date: string | null
  readonly next_action_at: string | null
}

export type IntelligenceTaskRow = {
  readonly id: string
  readonly lead_id: string | null
  readonly vehicle_id: string | null
  readonly type: string
  readonly status: string
  readonly title: string
  readonly due_at: string | null
  readonly snoozed_until: string | null
}

export type GarageIntelligenceSourceData = {
  readonly vehicles: readonly IntelligenceVehicleRow[]
  readonly costs: readonly IntelligenceCostRow[]
  readonly images: readonly IntelligenceImageRow[]
  readonly marketAnalyses: readonly IntelligenceMarketRow[]
  readonly leads: readonly IntelligenceLeadRow[]
  readonly tasks: readonly IntelligenceTaskRow[]
  readonly recommendations: readonly IntelligenceRecommendationRecord[]
}

const VEHICLE_COLUMNS = [
  "id", "garage_id", "live_slug", "brand", "model", "trim", "version",
  "status", "publication_status", "selling_price", "purchase_price",
  "description", "year", "mileage", "fuel", "gearbox", "vin",
  "registration_number", "created_at", "updated_at", "published_at",
].join(",")

const RECOMMENDATION_COLUMNS = [
  "id", "garage_id", "recommendation_key", "type", "category", "entity_type",
  "entity_id", "status", "score", "payload", "first_detected_at",
  "last_detected_at", "resolved_at", "dismissed_at", "snoozed_until",
  "created_at", "updated_at",
].join(",")

export async function getGarageIntelligenceSourceData(
  session: ActiveGarageSession
): Promise<GarageIntelligenceSourceData> {
  if (!session.garageId) {
    return {
      vehicles: [], costs: [], images: [], marketAnalyses: [],
      leads: [], tasks: [], recommendations: [],
    }
  }
  const supabase = await createClient()
  const [vehicleResult, leadResult, taskResult, recommendationResult] = await Promise.all([
    supabase.from("vehicles").select(VEHICLE_COLUMNS).eq("garage_id", session.garageId)
      .order("created_at", { ascending: false }).limit(300),
    supabase.from("leads")
      .select("id,vehicle_id,customer_name,vehicle_title_snapshot,status,type,created_at,first_contacted_at,last_contacted_at,preferred_date,next_action_at")
      .eq("garage_id", session.garageId).order("created_at", { ascending: false }).limit(500),
    supabase.from("commercial_tasks")
      .select("id,lead_id,vehicle_id,type,status,title,due_at,snoozed_until")
      .eq("garage_id", session.garageId).order("created_at", { ascending: false }).limit(500),
    supabase.from("intelligence_recommendations").select(RECOMMENDATION_COLUMNS)
      .eq("garage_id", session.garageId).order("last_detected_at", { ascending: false }).limit(500),
  ])
  if (vehicleResult.error) throw new Error(`Lecture du stock Intelligence impossible (${vehicleResult.error.code}).`)
  if (leadResult.error) throw new Error(`Lecture des prospects Intelligence impossible (${leadResult.error.code}).`)
  if (taskResult.error) throw new Error(`Lecture des tâches Intelligence impossible (${taskResult.error.code}).`)
  if (recommendationResult.error) throw new Error(`Lecture des recommandations impossible (${recommendationResult.error.code}).`)
  const vehicles = (vehicleResult.data ?? []) as unknown as IntelligenceVehicleRow[]
  const vehicleIds = vehicles.map((vehicle) => vehicle.id)
  if (!vehicleIds.length) {
    return {
      vehicles,
      costs: [],
      images: [],
      marketAnalyses: [],
      leads: (leadResult.data ?? []) as unknown as IntelligenceLeadRow[],
      tasks: (taskResult.data ?? []) as unknown as IntelligenceTaskRow[],
      recommendations: (recommendationResult.data ?? []) as unknown as IntelligenceRecommendationRecord[],
    }
  }
  const [costResult, imageResult, marketResult] = await Promise.all([
    supabase.from("vehicle_costs").select("vehicle_id,amount").in("vehicle_id", vehicleIds),
    supabase.from("vehicle_images").select("vehicle_id,type").in("vehicle_id", vehicleIds),
    supabase.from("vehicle_market_analyses")
      .select("vehicle_id,comparable_count,minimum_price,maximum_price,average_price,median_price,price_difference,price_difference_percent,analyzed_at")
      .in("vehicle_id", vehicleIds).order("analyzed_at", { ascending: false }).limit(1_000),
  ])
  if (costResult.error) throw new Error(`Lecture des coûts Intelligence impossible (${costResult.error.code}).`)
  if (imageResult.error) throw new Error(`Lecture des photos Intelligence impossible (${imageResult.error.code}).`)
  if (marketResult.error) throw new Error(`Lecture du marché Intelligence impossible (${marketResult.error.code}).`)
  return {
    vehicles,
    costs: (costResult.data ?? []) as unknown as IntelligenceCostRow[],
    images: (imageResult.data ?? []) as unknown as IntelligenceImageRow[],
    marketAnalyses: (marketResult.data ?? []) as unknown as IntelligenceMarketRow[],
    leads: (leadResult.data ?? []) as unknown as IntelligenceLeadRow[],
    tasks: (taskResult.data ?? []) as unknown as IntelligenceTaskRow[],
    recommendations: (recommendationResult.data ?? []) as unknown as IntelligenceRecommendationRecord[],
  }
}
