import { z } from "zod"

export const vehicleCostCategories = [
  "TECHNICAL_INSPECTION",
  "MECHANIC",
  "BODYWORK",
  "CLEANING",
  "TRANSPORT",
  "ADMIN",
  "WARRANTY",
  "TIRES",
  "PARTS",
  "OTHER",
] as const

export type VehicleCostCategory = (typeof vehicleCostCategories)[number]

export const vehicleCostCategoryLabels: Record<VehicleCostCategory, string> = {
  TECHNICAL_INSPECTION: "Contrôle technique",
  MECHANIC: "Mécanique",
  BODYWORK: "Carrosserie",
  CLEANING: "Nettoyage / préparation",
  TRANSPORT: "Transport",
  ADMIN: "Carte grise / administratif",
  WARRANTY: "Garantie",
  TIRES: "Pneus",
  PARTS: "Pièces",
  OTHER: "Autre",
}

export const vehicleCostSchema = z.object({
  type: z.enum(vehicleCostCategories, "Sélectionne une catégorie."),
  label: z.string().trim().min(1, "Le libellé est obligatoire.").max(160),
  amount: z.coerce.number().positive("Le montant doit être strictement positif."),
  incurredAt: z
    .string()
    .date("La date est invalide.")
    .refine(
      (value) => new Date(`${value}T00:00:00`).getTime() <= Date.now(),
      "La date ne peut pas être future."
    ),
  notes: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(2_000, "Les notes sont trop longues.").optional()
  ),
})

export type VehicleCostInput = z.infer<typeof vehicleCostSchema>

export function parseVehicleCostFormData(formData: FormData) {
  return vehicleCostSchema.safeParse({
    type: formData.get("type"),
    label: formData.get("label"),
    amount: formData.get("amount"),
    incurredAt: formData.get("incurredAt"),
    notes: formData.get("notes"),
  })
}
