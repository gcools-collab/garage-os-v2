import type { CopilotConfig } from "./types"

export const defaultCopilotConfig: CopilotConfig = Object.freeze({
  provider: "openai-compatible",
  model: process.env.COPILOT_MODEL?.trim() || "gpt-4.1-mini",
  temperature: 0.1,
  maxOutputTokens: 900,
  maxConversationMessages: 10,
  maxContextCharacters: 18_000,
  maxRecommendations: 8,
  maxVehicles: 12,
  maxLeads: 12,
  maxTasks: 12,
  maxMarketComparisons: 6,
  timeoutMs: 20_000,
  dailyGarageRequestLimit: 200,
  hourlyUserRequestLimit: 30,
  retentionDays: 90,
  allowedGeneralKnowledge: false,
  enablePersistence: true,
  enableStreaming: false,
})
