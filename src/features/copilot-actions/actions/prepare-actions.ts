import "server-only"

import type { ActiveGarageSession } from "@/features/tenant"
import { buildCopilotActionProposalViewModel } from "../builders"
import { validateActionPayload, validateActionTarget } from "../engine"
import { getCopilotActionRegistryEntry } from "../registry"
import { canPrepareCopilotAction } from "../security"
import type { CopilotActionProposalInput, CopilotActionProposalViewModel, CopilotActionTargetType } from "../types"
import { actionProposalSchema, openEntityPayloadSchema } from "../validation"
import {
  insertCopilotActionLog,
  loadCopilotActionTarget,
  resolveCopilotActionLog,
} from "./action-repository"

function expectedTargetType(proposal: CopilotActionProposalInput): CopilotActionTargetType | undefined {
  const entry = getCopilotActionRegistryEntry(proposal.action)
  if (entry.targetType !== "ANY") return entry.targetType
  if (proposal.action === "OPEN_ENTITY") {
    const parsed = openEntityPayloadSchema.safeParse(proposal.payload)
    return parsed.success ? parsed.data.entityType : undefined
  }
  return undefined
}

export async function prepareCopilotActionProposals(
  session: ActiveGarageSession,
  conversationId: string,
  rawProposals: readonly unknown[]
): Promise<readonly CopilotActionProposalViewModel[]> {
  const prepared: CopilotActionProposalViewModel[] = []
  for (const raw of rawProposals.slice(0, 3)) {
    const proposal = actionProposalSchema.safeParse(raw)
    if (!proposal.success) continue
    const payload = validateActionPayload(proposal.data.action, proposal.data.payload)
    if (!payload.success) continue
    const target = await loadCopilotActionTarget(
      session,
      proposal.data.targetId,
      expectedTargetType(proposal.data)
    )
    if (!target || !canPrepareCopilotAction(session, target)) continue
    const targetValidation = validateActionTarget(proposal.data, target)
    if (!targetValidation.valid) continue
    const created = await insertCopilotActionLog(
      session,
      conversationId,
      proposal.data,
      target,
      payload.data
    )
    const finalLog = proposal.data.action === "OPEN_ENTITY"
      ? await resolveCopilotActionLog(session, created.id, "EXECUTED", "Navigation préparée.")
      : created
    prepared.push(buildCopilotActionProposalViewModel(finalLog))
  }
  return prepared
}
