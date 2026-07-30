import { buildActionSummary } from "../engine"
import { getCopilotActionRegistryEntry } from "../registry"
import type { CopilotActionLog, CopilotActionProposalViewModel } from "../types"

export function buildCopilotActionProposalViewModel(
  log: CopilotActionLog
): CopilotActionProposalViewModel {
  const entry = getCopilotActionRegistryEntry(log.action)
  return {
    id: log.id,
    action: log.action,
    status: log.status,
    statusLabel: {
      PROPOSED: "En attente de confirmation",
      EXECUTED: "Exécutée",
      CANCELLED: "Annulée",
      REJECTED: "Refusée",
    }[log.status],
    summary: buildActionSummary({
      action: log.action,
      targetId: log.targetId,
      payload: log.payload,
      explanation: log.explanation,
      confidence: log.confidence,
    }, log.targetSnapshot),
    requiresConfirmation: entry.requiresConfirmation,
    navigationHref: log.action === "OPEN_ENTITY" ? log.targetSnapshot.href : null,
    canConfirm: log.status === "PROPOSED" && entry.requiresConfirmation,
    canCancel: log.status === "PROPOSED",
  }
}
