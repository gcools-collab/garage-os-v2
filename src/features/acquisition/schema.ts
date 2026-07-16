import { z } from "zod"

const optionalText = z.string().trim().max(10_000).nullable()

export const draftVehicleSchema = z.object({
  provider: z.string().trim().min(1).max(50),
  sourceUrl: z.url().refine((url) => url.startsWith("https://")),
  externalId: z.string().trim().min(1).max(255),
  publishedAt: z.string().nullable(),
  originalTitle: z.string().trim().min(1).max(300),
  brand: z.string().trim().max(80),
  model: z.string().trim().max(80),
  trim: z.string().trim().max(120).nullable(),
  year: z.number().int().min(1886).max(new Date().getFullYear() + 1).nullable(),
  mileage: z.number().int().nonnegative().nullable(),
  advertisedPrice: z.number().nonnegative().nullable(),
  description: optionalText,
  photos: z.array(z.url()).max(10),
  location: z.string().trim().max(200).nullable(),
  favoriteCount: z.number().int().nonnegative().nullable(),
  characteristics: z.object({
    fuel: z.string().max(50).nullable(),
    gearbox: z.string().max(50).nullable(),
    powerDin: z.number().int().min(0).max(3000).nullable(),
    fiscalPower: z.number().int().min(0).max(1000).nullable(),
    color: z.string().max(50).nullable(),
    doors: z.number().int().min(2).max(6).nullable(),
    seats: z.number().int().min(1).max(9).nullable(),
    firstRegistrationDate: z
      .string()
      .date("La date de première mise en circulation est invalide.")
      .refine(
        (value) => new Date(`${value}T00:00:00`).getTime() <= Date.now(),
        "La date de première mise en circulation ne peut pas être future."
      )
      .nullable(),
    bodyType: z.string().trim().max(80).nullable(),
    upholstery: z.string().trim().max(120).nullable(),
    critAir: z.number().int().min(0).max(5).nullable(),
  }).catchall(z.union([z.string(), z.number(), z.boolean(), z.null()])),
})

export const editableDraftVehicleSchema = draftVehicleSchema.superRefine(
  (draft, context) => {
    if (!draft.brand) {
      context.addIssue({ code: "custom", path: ["brand"], message: "La marque est obligatoire." })
    }
    if (!draft.model) {
      context.addIssue({ code: "custom", path: ["model"], message: "Le modèle est obligatoire." })
    }
    if (
      draft.characteristics.firstRegistrationDate &&
      draft.year &&
      new Date(`${draft.characteristics.firstRegistrationDate}T00:00:00`).getFullYear() <
        draft.year - 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["characteristics", "firstRegistrationDate"],
        message: "La date de mise en circulation n'est pas cohérente avec l'année.",
      })
    }
  }
)

export const acquisitionUrlSchema = z.url().refine(
  (url) => url.startsWith("https://"),
  "L'URL doit utiliser HTTPS."
)

export const acquisitionDetailsSchema = z.object({
  garageId: z.uuid("Sélectionne un garage valide."),
  purchasePrice: z.coerce.number().min(0, "Le prix d'achat doit être positif."),
  notes: z.string().trim().max(5_000, "Les notes sont trop longues."),
})
