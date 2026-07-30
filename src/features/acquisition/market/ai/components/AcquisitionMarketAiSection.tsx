import type { AcquisitionOpportunity } from "../../../types/opportunity"
import type { AcquisitionMarketAnalysis } from "../../types"
import { buildAcquisitionMarketAiInsightViewModel } from "../builders"
import { generateAcquisitionMarketAiInsight } from "../engine"
import { createAcquisitionMarketAiProvider } from "../repositories"
import { AcquisitionMarketAiCard } from "./AcquisitionMarketAiCard"

export async function AcquisitionMarketAiSection({
  opportunity,
  market,
}: {
  readonly opportunity: AcquisitionOpportunity
  readonly market: AcquisitionMarketAnalysis
}) {
  const result = await generateAcquisitionMarketAiInsight({
    opportunity,
    market,
    provider: createAcquisitionMarketAiProvider(),
  })
  return (
    <AcquisitionMarketAiCard
      insight={buildAcquisitionMarketAiInsightViewModel(result)}
    />
  )
}
