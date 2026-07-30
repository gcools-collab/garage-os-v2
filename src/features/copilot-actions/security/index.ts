import type { ActiveGarageSession } from "@/features/tenant"
import type { CopilotActionTargetSnapshot } from "../types"

export function canPrepareCopilotAction(
  session: ActiveGarageSession,
  target: CopilotActionTargetSnapshot
): boolean {
  return Boolean(
    session.garageId
    && session.memberRole
    && target.garageId === session.garageId
  )
}

export function canResolveCopilotAction(
  session: ActiveGarageSession,
  ownerUserId: string,
  garageId: string
): boolean {
  return Boolean(
    session.garageId === garageId
    && session.userId === ownerUserId
    && session.memberRole
  )
}
