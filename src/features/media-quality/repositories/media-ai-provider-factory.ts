import "server-only"
import { OpenAiCompatibleMediaProvider, type MediaAiProvider } from "../providers"

export function createMediaAiProvider(): MediaAiProvider | null {
  if (process.env.MEDIA_AI_ENABLED !== "true") return null
  const apiKey = process.env.MEDIA_AI_API_KEY?.trim() || process.env.COPILOT_API_KEY?.trim()
  const model = process.env.MEDIA_AI_MODEL?.trim() || process.env.COPILOT_MODEL?.trim()
  if (!apiKey || !model) return null
  return new OpenAiCompatibleMediaProvider(model, apiKey, process.env.MEDIA_AI_API_URL?.trim() || process.env.COPILOT_API_URL?.trim())
}
