import type { ActiveGarageSession } from "@/features/tenant"
import { garageBrandingUpdateSchema, resolveGarageBranding } from "../engine"
import type {
  GarageBrandingRecord,
  GarageBrandingUpdateInput,
  GarageBrandingUpdateResult,
} from "../types"

export type UpdateGarageBrandingDependencies = {
  readonly getSession: () => Promise<ActiveGarageSession | null>
  readonly upsert: (
    garageId: string,
    input: GarageBrandingUpdateInput
  ) => Promise<{ readonly data: GarageBrandingRecord | null; readonly error: string | null }>
}

function fieldErrors(error: ReturnType<typeof garageBrandingUpdateSchema.safeParse>) {
  if (error.success) return undefined
  const flattened = error.error.flatten().fieldErrors
  return Object.fromEntries(
    Object.entries(flattened).filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
  )
}

export async function updateGarageBrandingWithDependencies(
  input: GarageBrandingUpdateInput,
  dependencies: UpdateGarageBrandingDependencies
): Promise<GarageBrandingUpdateResult> {
  const session = await dependencies.getSession()
  if (!session) {
    return { success: false, code: "UNAUTHENTICATED", message: "Utilisateur non authentifié." }
  }
  if (!session.garageId || !session.garageName) {
    return { success: false, code: "NO_ACTIVE_GARAGE", message: "Aucun garage actif n’est sélectionné." }
  }
  if (session.memberRole !== "owner" && session.memberRole !== "admin") {
    return { success: false, code: "FORBIDDEN", message: "Vous ne pouvez pas modifier le branding de ce garage." }
  }

  const parsed = garageBrandingUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Certaines informations sont invalides.",
      fieldErrors: fieldErrors(parsed),
    }
  }

  const result = await dependencies.upsert(session.garageId, parsed.data)
  if (result.error || !result.data) {
    return { success: false, code: "DATABASE_ERROR", message: "Impossible d’enregistrer le branding." }
  }

  return {
    success: true,
    branding: resolveGarageBranding({
      garage: { id: session.garageId, name: session.garageName },
      record: result.data,
    }),
  }
}
