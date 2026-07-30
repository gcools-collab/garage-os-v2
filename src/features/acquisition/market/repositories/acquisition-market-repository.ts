import "server-only"

import type { AcquisitionOpportunity } from "../../types/opportunity"
import { collectAcquisitionMarketAnalysis } from "../engine"
import type {
  AcquisitionMarketAnalysis,
  MarketProvider,
} from "../types"
import type { GarageMarketLocation } from "../geography"

export async function getAcquisitionMarketAnalysis(
  opportunity: AcquisitionOpportunity,
  provider: MarketProvider | null,
  now = new Date(),
  origin?: GarageMarketLocation
): Promise<AcquisitionMarketAnalysis> {
  return collectAcquisitionMarketAnalysis(opportunity, provider, now, origin)
}
