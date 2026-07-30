import "server-only"

import { OpenAiCompatibleCopilotProvider } from "@/features/copilot/providers/openai-compatible-provider"
import { CopilotCompatibleMarketAiProvider } from "../providers"
import type { AcquisitionMarketAiProvider } from "../types"

export function createAcquisitionMarketAiProvider(): AcquisitionMarketAiProvider | null {
  if (process.env.AI_INSIGHTS_ENABLED !== "true") return null
  const apiKey = process.env.AI_INSIGHTS_API_KEY ?? process.env.COPILOT_API_KEY
  const model = process.env.AI_INSIGHTS_MODEL ?? process.env.COPILOT_MODEL
  const endpoint = process.env.AI_INSIGHTS_API_URL ?? process.env.COPILOT_API_URL
  if (!apiKey || !model) return null
  return new CopilotCompatibleMarketAiProvider(
    new OpenAiCompatibleCopilotProvider(apiKey, model, endpoint)
  )
}
