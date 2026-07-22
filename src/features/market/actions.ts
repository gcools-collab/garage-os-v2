"use server"

import { revalidatePath } from "next/cache"

import { DeterministicMatchingEngine, prepareComparableListings } from "./matching"
import { LeboncoinBridgeClient, LeboncoinProvider } from "./providers"
import { calculateMarketPosition, calculateMarketStatistics, buildMarketSearchCriteria, MarketService } from "./services"
import type { MarketAnalysisActionResult } from "./state"
import { createClient } from "@/lib/supabase/server"

export async function analyzeVehicleMarket(vehicleId: string): Promise<MarketAnalysisActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, message: "Vous devez être connecté pour lancer une analyse." }
    const { data: vehicle, error } = await supabase.from("vehicles")
      .select("id, brand, model, trim, year, mileage, fuel, gearbox, power_din, selling_price, marketplace_links(provider, external_id, url)")
      .eq("id", vehicleId).single()
    if (error || !vehicle) return { ok: false, message: "Véhicule introuvable ou accès refusé." }

    const criteria = buildMarketSearchCriteria({ ...vehicle, powerDin: vehicle.power_din })
    const url = process.env.LEBONCOIN_BRIDGE_URL
    const key = process.env.LEBONCOIN_BRIDGE_API_KEY
    if (!url || !key) return { ok: false, message: "Le service d’analyse du marché n’est pas configuré." }
    const service = new MarketService(new LeboncoinProvider(new LeboncoinBridgeClient(url, key)))
    const listings = await service.search(criteria)
    const preparedListings = prepareComparableListings(
      listings,
      (vehicle.marketplace_links ?? []).map((link) => ({
        providerId: link.provider,
        externalId: link.external_id,
        url: link.url,
        title: [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" "),
        price: vehicle.selling_price == null ? null : Number(vehicle.selling_price),
        mileage: vehicle.mileage,
      }))
    )
    const comparables = await new DeterministicMatchingEngine().match(criteria, preparedListings)
    const statistics = calculateMarketStatistics(comparables)
    const currentPrice = vehicle.selling_price == null ? null : Number(vehicle.selling_price)
    const position = calculateMarketPosition(currentPrice, statistics.medianPrice)
    const analyzedAt = new Date().toISOString()
    const { data: snapshot, error: insertError } = await supabase.from("vehicle_market_analyses").insert({
      vehicle_id: vehicle.id, provider: "leboncoin", criteria,
      comparable_count: statistics.comparableCount, minimum_price: statistics.minimumPrice,
      maximum_price: statistics.maximumPrice, average_price: statistics.averagePrice,
      median_price: statistics.medianPrice, average_mileage: statistics.averageMileage,
      average_listing_age_days: statistics.averageListingAgeDays, current_vehicle_price: currentPrice,
      price_difference: position?.difference ?? null, price_difference_percent: position?.differencePercent ?? null,
      positioning: position?.positioning ?? null,
      raw_summary: { professionalCount: statistics.professionalCount, privateCount: statistics.privateCount }, analyzed_at: analyzedAt,
    }).select("id").single()
    if (insertError || !snapshot) return { ok: false, message: `Analyse obtenue mais impossible à enregistrer : ${insertError?.message ?? "erreur inconnue"}` }
    revalidatePath(`/stock/${vehicle.id}`)
    return { ok: true, analysis: { id: snapshot.id, analyzedAt, ...statistics, currentVehiclePrice: currentPrice, priceDifference: position?.difference ?? null, priceDifferencePercent: position?.differencePercent ?? null, positioning: position?.positioning ?? null }, comparables: comparables.slice(0, 8) }
  } catch (error) {
    console.error("Market provider operation failed", {
      provider: "leboncoin",
      operation: "search",
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    })
    const message = error instanceof Error ? error.message : "Erreur inconnue."
    return { ok: false, message: `Analyse impossible : ${message}` }
  }
}
