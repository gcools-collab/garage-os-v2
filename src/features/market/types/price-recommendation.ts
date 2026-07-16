export type PriceRecommendationConfidence = "LOW" | "MEDIUM" | "HIGH"

export type PriceRecommendation = {
  recommendedPrice: number
  minimumPrice: number
  maximumPrice: number
  currency: string
  confidence: PriceRecommendationConfidence
  sampleSize: number
  rationale: string[]
}
