import type { AcquisitionMarketAiResult } from "../types"
import type { AcquisitionMarketAiInsightViewModel } from "../presentation"

const CONFIDENCE = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée" } as const

export function buildAcquisitionMarketAiInsightViewModel(
  result: AcquisitionMarketAiResult
): AcquisitionMarketAiInsightViewModel {
  if (!result.available) return {
    available: false,
    title: "Analyse IA",
    description: result.message,
    confidenceLabel: null,
    summary: null,
    positiveSignals: [],
    riskSignals: [],
    extractedFacts: [],
    recommendedChecks: [],
    negotiationArguments: [],
    limitations: [],
  }
  return {
    available: true,
    title: "Analyse IA",
    description: "Interprétation facultative de données publiques et structurées.",
    confidenceLabel: CONFIDENCE[result.insight.confidence],
    summary: result.insight.summary,
    positiveSignals: result.insight.positiveSignals.map((item) =>
      `${item.label} — ${item.explanation} (${item.sourceReference}, confiance ${CONFIDENCE[item.confidence].toLowerCase()})`
    ),
    riskSignals: result.insight.riskSignals.map((item) =>
      `${item.label} — ${item.explanation} (${item.sourceReference}, confiance ${CONFIDENCE[item.confidence].toLowerCase()})`
    ),
    extractedFacts: result.insight.extractedFacts.map((item) =>
      `${item.value} — ${item.evidence} (${item.sourceReference}, ${item.status.toLowerCase()})`
    ),
    recommendedChecks: result.insight.recommendedChecks,
    negotiationArguments: result.insight.negotiationArguments,
    limitations: result.insight.limitations,
  }
}
