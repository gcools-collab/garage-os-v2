export interface AcquisitionMarketAiInsightViewModel {
  readonly available: boolean
  readonly title: string
  readonly description: string
  readonly confidenceLabel: string | null
  readonly summary: string | null
  readonly positiveSignals: readonly string[]
  readonly riskSignals: readonly string[]
  readonly extractedFacts: readonly string[]
  readonly recommendedChecks: readonly string[]
  readonly negotiationArguments: readonly string[]
  readonly limitations: readonly string[]
}
