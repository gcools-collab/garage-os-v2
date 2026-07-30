import { z } from "zod"
import {
  ACQUISITION_CONDITIONS,
  ACQUISITION_CONFIDENCE_LEVELS,
  ACQUISITION_DOCUMENT_CATEGORIES,
  ACQUISITION_PROVENANCES,
  ACQUISITION_SELLER_TYPES,
  ACQUISITION_STATUSES,
} from "../types/opportunity"

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || undefined)
const optionalNumber = z.preprocess(
  (value) => value === "" || value === null ? undefined : Number(value),
  z.number().nonnegative().optional()
)

export const acquisitionOpportunitySchema = z.object({
  sellerType: z.enum(ACQUISITION_SELLER_TYPES),
  sellerName: z.string().trim().min(1, "Le vendeur est obligatoire.").max(120),
  sellerPhone: optionalText(30),
  sellerEmail: z.union([z.literal(""), z.email("Email invalide.")])
    .optional().transform((value) => value || undefined),
  sellerCity: optionalText(100),
  sellerComments: optionalText(2_000),
  provenance: z.enum(ACQUISITION_PROVENANCES),
  confidenceLevel: z.enum(ACQUISITION_CONFIDENCE_LEVELS),
  registration: optionalText(20),
  vin: z.union([
    z.literal(""),
    z.string().trim().regex(/^[A-HJ-NPR-Z0-9]{17}$/i, "Le VIN doit contenir 17 caractères valides."),
  ]).optional().transform((value) => value || undefined),
  brand: z.string().trim().min(1, "La marque est obligatoire.").max(80),
  model: z.string().trim().min(1, "Le modèle est obligatoire.").max(80),
  trim: optionalText(120),
  year: z.preprocess(
    (value) => value === "" || value === null ? undefined : Number(value),
    z.number().int().min(1900).max(new Date().getFullYear() + 1).optional()
  ),
  fuel: optionalText(50),
  gearbox: optionalText(50),
  mileage: z.preprocess(
    (value) => value === "" || value === null ? undefined : Number(value),
    z.number().int().nonnegative().optional()
  ),
  color: optionalText(50),
  options: z.array(z.string().trim().min(1).max(100)).max(100),
  generalCondition: z.enum(ACQUISITION_CONDITIONS),
  askingPrice: optionalNumber,
  repairEstimate: optionalNumber,
  comments: optionalText(5_000),
  sourceUrl: z.union([z.literal(""), z.url("URL invalide.")])
    .optional().transform((value) => value || undefined),
})
export type ValidAcquisitionOpportunityInput = z.infer<typeof acquisitionOpportunitySchema>

export const acquisitionStatusChangeSchema = z.object({
  opportunityId: z.uuid(),
  status: z.enum(ACQUISITION_STATUSES),
})

export const acquisitionDocumentSchema = z.object({
  opportunityId: z.uuid(),
  category: z.enum(ACQUISITION_DOCUMENT_CATEGORIES),
  label: z.string().trim().min(1).max(120),
})

export function parseAcquisitionFormData(formData: FormData) {
  return acquisitionOpportunitySchema.safeParse({
    sellerType: formData.get("sellerType"),
    sellerName: formData.get("sellerName"),
    sellerPhone: formData.get("sellerPhone"),
    sellerEmail: formData.get("sellerEmail"),
    sellerCity: formData.get("sellerCity"),
    sellerComments: formData.get("sellerComments"),
    provenance: formData.get("provenance"),
    confidenceLevel: formData.get("confidenceLevel"),
    registration: formData.get("registration"),
    vin: formData.get("vin"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    trim: formData.get("trim"),
    year: formData.get("year"),
    fuel: formData.get("fuel"),
    gearbox: formData.get("gearbox"),
    mileage: formData.get("mileage"),
    color: formData.get("color"),
    options: String(formData.get("options") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    generalCondition: formData.get("generalCondition"),
    askingPrice: formData.get("askingPrice"),
    repairEstimate: formData.get("repairEstimate"),
    comments: formData.get("comments"),
    sourceUrl: formData.get("sourceUrl"),
  })
}
