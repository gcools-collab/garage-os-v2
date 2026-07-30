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

export interface AcquisitionRecommendationRecord {
  readonly opportunity: AcquisitionOpportunity
  readonly recommendation: PurchaseRecommendation
  readonly marketAnalysis: AcquisitionMarketAnalysis
}

export async function getAcquisitionRecommendation(
  session: ActiveGarageSession,
  opportunityId: string,
  now = new Date()
): Promise<AcquisitionRecommendationRecord | null> {
  const opportunity = await getAcquisitionOpportunity(session, opportunityId)
  if (!opportunity) return null
  const marketAnalysis = await getAcquisitionMarketAnalysis(
    opportunity,
    createAcquisitionMarketProvider(),
    now
  )
  return {
    opportunity,
    marketAnalysis,
    recommendation: buildPurchaseRecommendation({ opportunity, now, marketAnalysis }),
  }
}
