"use server"

import { revalidatePath } from "next/cache"

import { getActiveGarageSession } from "@/features/tenant"
import { buildCopilotActionProposalViewModel } from "../builders"
import { targetIsUnchanged } from "../engine"
import { canResolveCopilotAction } from "../security"
import type { CopilotActionResult } from "../types"
import { actionDecisionSchema } from "../validation"
import {
  getCopilotActionLog,
  loadCopilotActionTarget,
  resolveCopilotActionLog,
} from "./action-repository"
import {
  executeRegisteredCopilotAction,
  notifyCopilotActionResult,
} from "./action-executors"

async function context() {
  const session = await getActiveGarageSession()
  if (!session?.garageId || !session.memberRole) return null
  return session
}

function refresh(log: { readonly conversationId: string; readonly targetSnapshot: { readonly href: string } }) {
  revalidatePath("/copilot")
  revalidatePath(log.targetSnapshot.href)
  revalidatePath("/dashboard")
  revalidatePath("/commercial")
  revalidatePath("/stock")
  revalidatePath("/leads")
  revalidatePath("/notifications")
}

export async function confirmCopilotAction(input: unknown): Promise<CopilotActionResult> {
  const parsed = actionDecisionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Proposition invalide.", code: "INVALID_INPUT" }
  const session = await context()
  if (!session) return { success: false, error: "Session invalide.", code: "UNAUTHORIZED" }
  const log = await getCopilotActionLog(session, parsed.data.proposalId)
  if (!log || !canResolveCopilotAction(session, log.userId, log.garageId)) {
    return { success: false, error: "Cette proposition n’est pas accessible.", code: "FORBIDDEN" }
  }
  if (log.status !== "PROPOSED") {
    return { success: false, error: "Cette proposition a déjà été traitée.", code: "ALREADY_RESOLVED" }
  }
  const currentTarget = await loadCopilotActionTarget(session, log.targetId, log.targetType)
  if (!currentTarget || !targetIsUnchanged(log.targetSnapshot, currentTarget)) {
    const rejected = await resolveCopilotActionLog(
      session, log.id, "REJECTED",
      "La cible a changé depuis la création de la proposition."
    )
    return {
      success: false,
      error: "Les données ont changé. Demandez une nouvelle proposition au Copilote.",
      code: rejected.status,
    }
  }
  try {
    const message = await executeRegisteredCopilotAction(session, log, currentTarget)
    const executed = await resolveCopilotActionLog(session, log.id, "EXECUTED", message)
    await notifyCopilotActionResult(session, executed, message)
    refresh(executed)
    return {
      success: true,
      proposal: buildCopilotActionProposalViewModel(executed),
      message,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action impossible"
    const rejected = await resolveCopilotActionLog(session, log.id, "REJECTED", message)
    refresh(rejected)
    return {
      success: false,
      error: "L’action n’a pas pu être exécutée. Aucune autre donnée n’a été modifiée.",
      code: "EXECUTION_FAILED",
    }
  }
}

export async function cancelCopilotAction(input: unknown): Promise<CopilotActionResult> {
  const parsed = actionDecisionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Proposition invalide.", code: "INVALID_INPUT" }
  const session = await context()
  if (!session) return { success: false, error: "Session invalide.", code: "UNAUTHORIZED" }
  const log = await getCopilotActionLog(session, parsed.data.proposalId)
  if (!log || !canResolveCopilotAction(session, log.userId, log.garageId)) {
    return { success: false, error: "Cette proposition n’est pas accessible.", code: "FORBIDDEN" }
  }
  if (log.status !== "PROPOSED") {
    return { success: false, error: "Cette proposition a déjà été traitée.", code: "ALREADY_RESOLVED" }
  }
  const cancelled = await resolveCopilotActionLog(session, log.id, "CANCELLED", "Action annulée par l’utilisateur.")
  refresh(cancelled)
  return {
    success: true,
    proposal: buildCopilotActionProposalViewModel(cancelled),
    message: "La proposition a été annulée.",
  }
}
