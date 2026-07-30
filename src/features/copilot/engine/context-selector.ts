import type {
  CopilotConfig,
  CopilotGarageContextSnapshot,
  CopilotIntent,
} from "../types"

export function selectCopilotContext(
  snapshot: CopilotGarageContextSnapshot,
  intent: CopilotIntent,
  config: CopilotConfig
): CopilotGarageContextSnapshot {
  const includeVehicles = ["VEHICLE_ANALYSIS", "STOCK_OVERVIEW", "PRICING_ANALYSIS", "PUBLICATION_ANALYSIS", "PROFITABILITY_OVERVIEW", "DAILY_PRIORITIES"].includes(intent)
  const includeCommercial = ["COMMERCIAL_OVERVIEW", "LEAD_ANALYSIS", "DAILY_PRIORITIES"].includes(intent)
  const includeRecommendations = intent !== "UNSUPPORTED"
  return {
    ...snapshot,
    intelligenceBrief: {
      ...snapshot.intelligenceBrief,
      recommendations: includeRecommendations
        ? snapshot.intelligenceBrief.recommendations.slice(0, config.maxRecommendations)
        : [],
    },
    selectedEntities: {
      vehicles: includeVehicles ? snapshot.selectedEntities.vehicles.slice(0, config.maxVehicles) : [],
      leads: includeCommercial ? snapshot.selectedEntities.leads.slice(0, config.maxLeads) : [],
      tasks: includeCommercial ? snapshot.selectedEntities.tasks.slice(0, config.maxTasks) : [],
      recommendations: includeRecommendations
        ? snapshot.selectedEntities.recommendations.slice(0, config.maxRecommendations)
        : [],
    },
  }
}

export function serializeCopilotContext(
  snapshot: CopilotGarageContextSnapshot,
  maxCharacters: number
): string {
  return JSON.stringify(snapshot).slice(0, maxCharacters)
}
