import type { VehicleDocumentCategory } from "./document-categories"

export type VehicleDocument = {
  id: string
  garage_id: string
  vehicle_id: string
  category: VehicleDocumentCategory
  label: string
  original_filename: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export type VehicleDocumentActionState = {
  success: boolean
  message?: string
  errors?: Record<string, string[] | undefined>
}

export type VehicleDocumentSummary = {
  total: number
  presentCategories: VehicleDocumentCategory[]
  missingImportantCategories: VehicleDocumentCategory[]
  completenessPercentage: number
}

export const initialVehicleDocumentActionState: VehicleDocumentActionState = { success: false }
