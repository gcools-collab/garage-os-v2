import { z } from "zod"

export const vehicleImageCategories = [
  "EXTERIOR",
  "INTERIOR",
  "ENGINE",
  "DETAIL",
  "DOCUMENT",
  "UNCLASSIFIED",
  "OTHER",
] as const

export const vehicleImageCategorySchema = z.enum(vehicleImageCategories)

export type VehicleImageCategory = z.infer<typeof vehicleImageCategorySchema>

export const vehicleImageCategoryLabels: Record<VehicleImageCategory, string> = {
  EXTERIOR: "Extérieur",
  INTERIOR: "Intérieur",
  ENGINE: "Moteur",
  DETAIL: "Détail",
  DOCUMENT: "Document",
  UNCLASSIFIED: "À classer",
  OTHER: "Autre",
}
