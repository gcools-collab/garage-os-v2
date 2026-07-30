import "server-only"

import type { ActiveGarageSession } from "@/features/tenant"
import { getAcquisitionOpportunity } from "../../repositories/opportunity-repository"
import { buildPurchaseRecommendation } from "../engine"
import type { AcquisitionOpportunity } from "../../types/opportunity"
import type { PurchaseRecommendation } from "../types"
import {
  createAcquisitionMarketProvider,
  getAcquisitionMarketAnalysis,
} from "../../market/repositories"
import type { AcquisitionMarketAnalysis } from "../../market/types"
import { createClient } from "@/lib/supabase/server"
import type { GarageMarketLocation } from "../../market/geography"

export interface AcquisitionRecommendationRecord {
  readonly opportunity: AcquisitionOpportunity
  readonly recommendation: PurchaseRecommendation
  readonly marketAnalysis: AcquisitionMarketAnalysis
}

async function getGarageMarketLocation(
  garageId: string
): Promise<GarageMarketLocation> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("garage_branding")
    .select("postal_code, city, latitude, longitude")
    .eq("garage_id", garageId)
    .maybeSingle()
  if (error) {
    console.error("Unable to load garage market location", {
      code: error.code,
      message: error.message,
    })
    return { postalCode: null, city: null, coordinates: null }
  }
  return {
    postalCode: data?.postal_code ?? null,
    city: data?.city ?? null,
    coordinates: data?.latitude == null || data.longitude == null
      ? null
      : { latitude: data.latitude, longitude: data.longitude },
  }
}

export async function getAcquisitionRecommendation(
  session: ActiveGarageSession,
  opportunityId: string,
  now = new Date()
): Promise<AcquisitionRecommendationRecord | null> {
  const opportunity = await getAcquisitionOpportunity(session, opportunityId)
  if (!opportunity) return null
  const marketLocation = session.garageId
    ? await getGarageMarketLocation(session.garageId)
    : { postalCode: null, city: null, coordinates: null }
  const marketAnalysis = await getAcquisitionMarketAnalysis(
    opportunity,
    createAcquisitionMarketProvider(),
    now,
    marketLocation
  )
  return {
    opportunity,
    marketAnalysis,
    recommendation: buildPurchaseRecommendation({ opportunity, now, marketAnalysis }),
  }
}
