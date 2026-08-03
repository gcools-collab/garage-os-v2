import { z } from "zod"

export const mediaAiInsightSchema = z.object({
  summary: z.string().trim().min(1).max(1000),
  score: z.number().int().min(0).max(100),
  findings: z.array(z.object({
    fact: z.string().trim().min(1).max(240),
    evidence: z.string().trim().min(1).max(500),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    suggestion: z.string().trim().min(1).max(500),
    source: z.literal("AI"),
    itemId: z.string().trim().max(120).nullable(),
  }).strict()).max(20),
  limitations: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
}).strict()
