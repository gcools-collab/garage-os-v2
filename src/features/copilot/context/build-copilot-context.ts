import type { GarageIntelligenceBrief, GarageIntelligenceSnapshot } from "@/features/intelligence"
import type { CopilotGarageContextSnapshot } from "../types"

export function buildCopilotGarageContext(
  snapshot: GarageIntelligenceSnapshot,
  brief: GarageIntelligenceBrief
): CopilotGarageContextSnapshot {
  const uncontactedLeads = snapshot.leads.filter((lead) => !lead.firstContactedAt).length
  const overdueTasks = snapshot.commercialTasks.filter((task) =>
    task.status !== "COMPLETED" && task.dueAt !== null && task.dueAt < snapshot.generatedAt
  ).length
  return {
    garage: snapshot.garage,
    generatedAt: snapshot.generatedAt,
    intelligenceBrief: {
      summary: brief.recommendations.length
        ? `${brief.recommendations.length} recommandation(s) active(s) détectée(s).`
        : "Aucune priorité particulière détectée.",
      recommendations: brief.recommendations,
    },
    commercialSummary: {
      activeLeads: snapshot.leads.length,
      uncontactedLeads,
      overdueTasks,
    },
    stockSummary: {
      vehicleCount: snapshot.vehicles.length,
      stockValueCents: snapshot.metrics.stockValueCents,
      capitalInvestedCents: snapshot.metrics.capitalInvestedCents,
      potentialMarginCents: snapshot.metrics.potentialMarginCents,
    },
    selectedEntities: {
      vehicles: snapshot.vehicles,
      leads: snapshot.leads,
      tasks: snapshot.commercialTasks,
      recommendations: brief.recommendations,
    },
  }
}
