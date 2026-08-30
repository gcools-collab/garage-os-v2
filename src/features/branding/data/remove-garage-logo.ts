import type { ActiveGarageSession } from "@/features/tenant"
import type { GarageLogoActionResult } from "../types"

export type RemoveGarageLogoDependencies = {
  readonly getSession: () => Promise<ActiveGarageSession | null>
  readonly getCurrentLogoPath: (garageId: string) => Promise<string | null>
  readonly removeLogoObject: (garageId: string, logoPath: string | null) => Promise<{ readonly error: string | null }>
  readonly persistLogoPath: (
    garageId: string,
    garageName: string,
    logoPath: string | null
  ) => Promise<{ readonly error: string | null }>
}

export async function removeGarageLogoWithDependencies(
  dependencies: RemoveGarageLogoDependencies
): Promise<GarageLogoActionResult> {
  const session = await dependencies.getSession()
  if (!session) {
    return { success: false, code: "UNAUTHENTICATED", message: "Utilisateur non authentifié." }
  }
  if (!session.garageId || !session.garageName) {
    return { success: false, code: "NO_ACTIVE_GARAGE", message: "Aucun garage actif n’est sélectionné." }
  }
  if (session.memberRole !== "owner" && session.memberRole !== "admin") {
    return { success: false, code: "FORBIDDEN", message: "Vous ne pouvez pas modifier le logo de ce garage." }
  }

  const currentPath = await dependencies.getCurrentLogoPath(session.garageId)
  if (!currentPath) {
    return { success: true, logoUrl: null }
  }

  const removeResult = await dependencies.removeLogoObject(session.garageId, currentPath)
  if (removeResult.error) {
    return { success: false, code: "STORAGE_ERROR", message: removeResult.error }
  }

  const persistResult = await dependencies.persistLogoPath(session.garageId, session.garageName, null)
  if (persistResult.error) {
    return { success: false, code: "DATABASE_ERROR", message: "Impossible de supprimer le logo." }
  }

  return { success: true, logoUrl: null }
}
