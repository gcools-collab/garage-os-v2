export type AiInsightConfidence = "LOW" | "MEDIUM" | "HIGH"
export type AiInsightSourceType =
  | "LISTING_DESCRIPTION" | "LISTING_PHOTO" | "MARKET_ANALYSIS"
  | "OPPORTUNITY_DECLARATION"

export interface AiSignal {
  readonly code: string
  readonly label: string
  readonly explanation: string
  readonly sourceType: AiInsightSourceType
  readonly sourceReference: string
  readonly confidence: AiInsightConfidence
}

export interface ExtractedFact {
  readonly code: string
  readonly value: string
  readonly sourceType: AiInsightSourceType
  readonly sourceReference: string
  readonly evidence: string
  readonly confidence: AiInsightConfidence
  readonly status: "CONFIRMED" | "PROBABLE" | "UNCERTAIN"
}

export interface AcquisitionMarketAiInsight {
  readonly summary: string
  readonly positiveSignals: readonly AiSignal[]
  readonly riskSignals: readonly AiSignal[]
  readonly extractedFacts: readonly ExtractedFact[]
  readonly recommendedChecks: readonly string[]
  readonly negotiationArguments: readonly string[]
  readonly limitations: readonly string[]
  readonly confidence: AiInsightConfidence
}

export interface AcquisitionMarketAiContext {
  readonly vehicle: {
    readonly brand: string
    readonly model: string
    readonly trim: string | null
    readonly year: number | null
    readonly mileage: number | null
    readonly fuel: string | null
    readonly gearbox: string | null
    readonly generalCondition: string
    readonly declaredPrice: number | null
    readonly declaredRepairEstimate: number | null
  }
  readonly deterministicMarket: {
    readonly comparableCount: number
    readonly displayedPriceMedian: number | null
    readonly displayedPriceRange: readonly [number | null, number | null]
    readonly signals: readonly string[]
    readonly confidence: string
  }
  readonly publicListings: readonly {
    readonly reference: string
    readonly description: string | null
    readonly imageUrls: readonly string[]
  }[]
}

export interface AcquisitionMarketAiProvider {
  readonly id: string
  readonly supportsVision: boolean
  generate(input: {
    readonly systemPrompt: string
    readonly context: AcquisitionMarketAiContext
    readonly responseSchema: string
    readonly timeoutMs: number
  }): Promise<unknown>
}

export type AcquisitionMarketAiResult =
  | { readonly available: true; readonly insight: AcquisitionMarketAiInsight }
  | { readonly available: false; readonly insight: null; readonly message: string }
