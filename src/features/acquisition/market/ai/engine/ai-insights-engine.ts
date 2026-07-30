import { buildAcquisitionMarketAiContext } from "../builders"
import {
  ACQUISITION_MARKET_AI_PROMPT_VERSION,
  ACQUISITION_MARKET_AI_SYSTEM_PROMPT,
} from "../prompts"
import type {
  AcquisitionMarketAiProvider,
  AcquisitionMarketAiResult,
} from "../types"
import { acquisitionMarketAiInsightSchema } from "../validation"
import type { AcquisitionOpportunity } from "../../../types/opportunity"
import type { AcquisitionMarketAnalysis } from "../../types"

export const ACQUISITION_MARKET_AI_RESPONSE_SCHEMA = JSON.stringify({
  summary: "string",
  positiveSignals: [{ code: "CODE", label: "string", explanation: "string", sourceType: "MARKET_ANALYSIS", sourceReference: "string", confidence: "MEDIUM" }],
  riskSignals: [],
  extractedFacts: [{ code: "CODE", value: "string", sourceType: "LISTING_DESCRIPTION", sourceReference: "string", evidence: "string", confidence: "MEDIUM", status: "PROBABLE" }],
  recommendedChecks: ["string"],
  negotiationArguments: ["string"],
  limitations: ["string"],
  confidence: "MEDIUM",
})

export async function generateAcquisitionMarketAiInsight(input: {
  readonly opportunity: AcquisitionOpportunity
  readonly market: AcquisitionMarketAnalysis
  readonly provider: AcquisitionMarketAiProvider | null
  readonly timeoutMs?: number
}): Promise<AcquisitionMarketAiResult> {
  if (!input.provider) {
    return { available: false, insight: null, message: "Enrichissement IA non configuré." }
  }
  try {
    const payload = await input.provider.generate({
      systemPrompt: `${ACQUISITION_MARKET_AI_SYSTEM_PROMPT}\nVersion: ${ACQUISITION_MARKET_AI_PROMPT_VERSION}`,
      context: buildAcquisitionMarketAiContext(
        input.opportunity, input.market, input.provider.supportsVision
      ),
      responseSchema: ACQUISITION_MARKET_AI_RESPONSE_SCHEMA,
      timeoutMs: Math.min(input.timeoutMs ?? 6_000, 10_000),
    })
    const parsed = acquisitionMarketAiInsightSchema.safeParse(payload)
    if (!parsed.success) {
      return { available: false, insight: null, message: "Réponse IA invalide et ignorée." }
    }
    return { available: true, insight: parsed.data }
  } catch (error) {
    console.error("Acquisition AI insight provider failed", {
      provider: input.provider.id,
      operation: "generate",
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    })
    return { available: false, insight: null, message: "Enrichissement IA temporairement indisponible." }
  }
}
