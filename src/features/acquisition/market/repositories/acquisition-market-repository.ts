import "server-only"

import type { AcquisitionOpportunity } from "../../types/opportunity"
import { collectAcquisitionMarketAnalysis } from "../engine"
import type {
  AcquisitionMarketAnalysis,
  MarketProvider,
} from "../types"

export async function getAcquisitionMarketAnalysis(
  opportunity: AcquisitionOpportunity,
  provider: MarketProvider | null,
  now = new Date()
): Promise<AcquisitionMarketAnalysis> {
  return collectAcquisitionMarketAnalysis(opportunity, provider, now)
}
