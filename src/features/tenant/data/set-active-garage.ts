import { z } from "zod"

import type { GarageMembership, SetActiveGarageResult } from "../types"

const garageIdSchema = z.uuid()

export type SetActiveGarageDependencies = {
  readonly loadMemberships: () => Promise<{
    readonly userId: string
    readonly memberships: readonly GarageMembership[]
  } | null>
  readonly persistGarageId: (garageId: string) => Promise<void>
}

export async function setActiveGarageWithDependencies(
  garageId: string,
  dependencies: SetActiveGarageDependencies
): Promise<SetActiveGarageResult> {
  const parsedGarageId = garageIdSchema.safeParse(garageId)
  if (!parsedGarageId.success) {
    return { success: false, error: "Identifiant de garage invalide." }
  }

  const context = await dependencies.loadMemberships()
  if (!context) return { success: false, error: "Utilisateur non authentifié." }

  const authorized = context.memberships.some(
    (membership) => membership.userId === context.userId && membership.garageId === parsedGarageId.data
  )
  if (!authorized) {
    return { success: false, error: "Vous n’êtes pas autorisé à accéder à ce garage." }
  }

  await dependencies.persistGarageId(parsedGarageId.data)
  return { success: true, garageId: parsedGarageId.data }
}
