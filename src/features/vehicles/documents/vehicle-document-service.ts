import { importantVehicleDocumentCategories, vehicleDocumentCategories, type VehicleDocumentCategory } from "./document-categories"
import type { VehicleDocumentSummary } from "./types"

export function calculateVehicleDocumentSummary(
  documents: ReadonlyArray<{ category: VehicleDocumentCategory }>
): VehicleDocumentSummary {
  const categories = new Set(documents.map((document) => document.category))
  const presentCategories = vehicleDocumentCategories.filter((category) => categories.has(category))
  const missingImportantCategories = importantVehicleDocumentCategories.filter((category) => !categories.has(category))
  const importantCount = importantVehicleDocumentCategories.length
  return {
    total: documents.length,
    presentCategories,
    missingImportantCategories,
    completenessPercentage: importantCount === 0 ? 100 : Math.round(((importantCount - missingImportantCategories.length) / importantCount) * 100),
  }
}
