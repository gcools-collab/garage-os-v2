import type { ActiveGarageSession } from "@/features/tenant"
import {
  getLogoExtension,
  hasValidLogoSignature,
  isAllowedLogoMimeType,
  readLogoDimensions,
  validateLogoDimensions,
  validateLogoFile,
} from "../validation"
import type { GarageLogoActionResult } from "../types"
import type { LogoStorageResult } from "./logo-storage"

export type UploadGarageLogoDependencies = {
  readonly getSession: () => Promise<ActiveGarageSession | null>
  readonly replaceLogoObject: (garageId: string, file: File, extension: string) => Promise<LogoStorageResult>
  readonly persistLogoPath: (
    garageId: string,
    garageName: string,
    logoPath: string
  ) => Promise<{ readonly error: string | null }>
  readonly buildPublicUrl: (garageId: string, path: string) => string | null
}

export async function uploadGarageLogoWithDependencies(
  formData: FormData,
  dependencies: UploadGarageLogoDependencies
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

  const file = formData.get("logo")
  if (!(file instanceof File)) {
    return { success: false, code: "VALIDATION_ERROR", message: "Sélectionnez un fichier." }
  }

  const typeOrSizeError = validateLogoFile(file)
  if (typeOrSizeError) {
    return { success: false, code: "VALIDATION_ERROR", message: typeOrSizeError }
  }
  if (!isAllowedLogoMimeType(file.type)) {
    return { success: false, code: "VALIDATION_ERROR", message: "Seuls les fichiers PNG, JPEG et WebP sont acceptés." }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasValidLogoSignature(file.type, bytes)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Le contenu du fichier ne correspond pas à une image valide de ce type.",
    }
  }

  const dimensionsError = validateLogoDimensions(readLogoDimensions(file.type, bytes))
  if (dimensionsError) {
    return { success: false, code: "VALIDATION_ERROR", message: dimensionsError }
  }

  const extension = getLogoExtension(file.type)
  const uploadResult = await dependencies.replaceLogoObject(session.garageId, file, extension)
  if (uploadResult.error || !uploadResult.path) {
    return {
      success: false,
      code: "STORAGE_ERROR",
      message: uploadResult.error ?? "Le téléversement du logo a échoué.",
    }
  }

  const persistResult = await dependencies.persistLogoPath(session.garageId, session.garageName, uploadResult.path)
  if (persistResult.error) {
    return { success: false, code: "DATABASE_ERROR", message: "Impossible d’enregistrer le logo." }
  }

  return { success: true, logoUrl: dependencies.buildPublicUrl(session.garageId, uploadResult.path) }
}
