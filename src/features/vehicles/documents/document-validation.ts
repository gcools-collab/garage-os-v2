import { z } from "zod"
import { vehicleDocumentCategories } from "./document-categories"

export const MAX_DOCUMENT_FILE_SIZE = 10 * 1024 * 1024
export const ALLOWED_DOCUMENT_TYPES = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
} as const

export const vehicleDocumentMetadataSchema = z.object({
  category: z.enum(vehicleDocumentCategories, { message: "Catégorie invalide." }),
  label: z.string().trim().min(1, "Le libellé est obligatoire.").max(120, "Le libellé est trop long."),
})

export function getFileExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ""
}

export function validateDocumentFile(file: Pick<File, "name" | "type" | "size">): string | null {
  if (!file.name || file.size <= 0) return "Sélectionnez un fichier."
  if (file.size > MAX_DOCUMENT_FILE_SIZE) return "Le fichier ne doit pas dépasser 10 Mo."
  const extensions = ALLOWED_DOCUMENT_TYPES[file.type as keyof typeof ALLOWED_DOCUMENT_TYPES]
  if (!extensions || !extensions.includes(getFileExtension(file.name) as never)) {
    return "Seuls les fichiers PDF, JPEG, PNG et WebP sont acceptés."
  }
  return null
}

export async function hasValidDocumentSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (file.type === "application/pdf") return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (file.type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])
  if (file.type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  }
  return false
}

export function sanitizeDocumentFilename(filename: string) {
  const extension = getFileExtension(filename)
  const rawBase = extension ? filename.slice(0, -(extension.length + 1)) : filename
  const base = rawBase.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "document"
  return extension ? `${base}.${extension}` : base
}

export function buildVehicleDocumentStoragePath(input: {
  garageId: string; vehicleId: string; documentId: string; filename: string
}) {
  return `${input.garageId}/${input.vehicleId}/${input.documentId}/${sanitizeDocumentFilename(input.filename)}`
}
