import { z } from "zod"

const confidence = z.enum(["LOW", "MEDIUM", "HIGH"])
const sourceType = z.enum([
  "LISTING_DESCRIPTION", "LISTING_PHOTO", "MARKET_ANALYSIS",
  "OPPORTUNITY_DECLARATION",
])
const bounded = z.string().trim().min(1).max(800)
const signal = z.object({
  code: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_]+$/),
  label: z.string().trim().min(1).max(120),
  explanation: bounded,
  sourceType,
  sourceReference: z.string().trim().min(1).max(160),
  confidence,
}).strict()
const fact = z.object({
  code: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_]+$/),
  value: z.string().trim().min(1).max(300),
  sourceType,
  sourceReference: z.string().trim().min(1).max(160),
  evidence: z.string().trim().min(1).max(500),
  confidence,
  status: z.enum(["CONFIRMED", "PROBABLE", "UNCERTAIN"]),
}).strict()

export const acquisitionMarketAiInsightSchema = z.object({
  summary: z.string().trim().min(1).max(1_500),
  positiveSignals: z.array(signal).max(12),
  riskSignals: z.array(signal).max(12),
  extractedFacts: z.array(fact).max(24),
  recommendedChecks: z.array(bounded).max(12),
  negotiationArguments: z.array(bounded).max(12),
  limitations: z.array(bounded).min(1).max(12),
  confidence,
}).strict()
