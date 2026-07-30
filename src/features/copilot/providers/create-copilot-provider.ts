import "server-only"

import type { CopilotConfig, CopilotProvider } from "../types"
import { OpenAiCompatibleCopilotProvider } from "./openai-compatible-provider"

export function createCopilotProvider(config: CopilotConfig): CopilotProvider {
  const apiKey = process.env.COPILOT_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error("COPILOT_PROVIDER_NOT_CONFIGURED")
  return new OpenAiCompatibleCopilotProvider(
    apiKey,
    config.model,
    process.env.COPILOT_API_URL?.trim() || undefined
  )
}
