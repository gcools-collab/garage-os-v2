import { z } from "zod"

const optionalText = z.string().trim().max(10_000).nullable()

export const draftVehicleSchema = z.object({
  provider: z.string().trim().min(1).max(50),
  sourceUrl: z.url().refine((url) => url.startsWith("https://")),
  externalId: z.string().trim().min(1).max(255),
  publishedAt: z.string().nullable(),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(80),
  trim: z.string().trim().max(120).nullable(),
  year: z.number().int().min(1886).max(new Date().getFullYear() + 1).nullable(),
  mileage: z.number().int().nonnegative().nullable(),
  advertisedPrice: z.number().nonnegative().nullable(),
  description: optionalText,
  photos: z.array(z.url()).max(10),
  characteristics: z.object({
    fuel: z.string().max(50).nullable(),
    gearbox: z.string().max(50).nullable(),
    powerDin: z.number().int().min(0).max(3000).nullable(),
    color: z.string().max(50).nullable(),
    doors: z.number().int().min(2).max(6).nullable(),
    seats: z.number().int().min(1).max(9).nullable(),
  }).catchall(z.union([z.string(), z.number(), z.boolean(), z.null()])),
})

export const acquisitionUrlSchema = z.url().refine(
  (url) => url.startsWith("https://"),
  "L'URL doit utiliser HTTPS."
)

export const acquisitionDetailsSchema = z.object({
  garageId: z.uuid("Sélectionne un garage valide."),
  purchasePrice: z.coerce.number().min(0, "Le prix d'achat doit être positif."),
  notes: z.string().trim().max(5_000, "Les notes sont trop longues."),
})
