export interface PurchaseRecommendationViewModel {
  readonly available: boolean
  readonly title: string
  readonly description: string
  readonly resaleRange: string
  readonly resaleMedian: string
  readonly recommendedPrice: string
  readonly maximumPrice: string
  readonly estimatedCosts: string
  readonly estimatedGrossMargin: string
  readonly estimatedNetMargin: string
  readonly riskLabel: string
  readonly riskTone: "positive" | "warning" | "danger" | "neutral"
  readonly confidenceLabel: string
  readonly scoreLabel: string
  readonly scores: readonly {
    readonly label: string
    readonly value: string
    readonly explanation: string
  }[]
  readonly factors: readonly {
    readonly label: string
    readonly impactLabel: string
    readonly explanation: string
  }[]
  readonly recommendations: readonly string[]
}
