import { z } from "zod"
import { PUBLIC_REQUEST_TYPES, type PublicRequestSource, type PublicRequestType } from "../types"

const optional = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null)
const common = z.object({
  garageSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  vehicleSlug: optional(160), requestType: z.enum(PUBLIC_REQUEST_TYPES),
  source: z.enum(["PUBLIC_WEBSITE", "VEHICLE_DETAIL", "CONTACT_CENTER", "SERVICE_PAGE", "CONSIGNMENT_PAGE"]),
  firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60),
  phone: optional(30).refine((value) => value === null || /^\+?[\d\s().-]{6,30}$/.test(value), "Téléphone invalide."),
  email: optional(254).refine((value) => value === null || z.email().safeParse(value).success, "E-mail invalide."),
  message: optional(2000), preferredDate: optional(10).refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Date invalide."), preferredTime: optional(30),
  consentContact: z.literal(true, "Votre accord est nécessaire."), consentMarketing: z.boolean(),
  website: z.string().max(200), formStartedAt: z.number().int().positive(), publicPageUrl: z.string().max(500),
  appointmentStartsAt: optional(40).refine((value) => value === null || !Number.isNaN(Date.parse(value)), "Créneau invalide."),
}).superRefine((value, context) => {
  if (!value.phone && !value.email) context.addIssue({ code: "custom", path: ["phone"], message: "Renseignez un téléphone ou un e-mail." })
  if (value.preferredDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (new Date(`${value.preferredDate}T00:00:00`).getTime() < today.getTime()) context.addIssue({ code: "custom", path: ["preferredDate"], message: "Choisissez une date à venir." })
  }
})

const detailSchemas: Readonly<Record<PublicRequestType, z.ZodType<Record<string, unknown>>>> = {
  VEHICLE_INQUIRY: z.object({ contactPreference: optional(30) }),
  TEST_DRIVE: z.object({}),
  TRADE_IN: z.object({ brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(80), year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1), mileage: z.coerce.number().int().min(0).max(2_000_000), registration: optional(30), fuel: optional(50), gearbox: optional(50), condition: optional(500), desiredPrice: z.coerce.number().min(0).max(10_000_000).optional() }),
  CONSIGNMENT: z.object({ brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(80), year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1), mileage: z.coerce.number().int().min(0).max(2_000_000), registration: optional(30), desiredPrice: z.coerce.number().min(0).max(10_000_000).optional() }),
  REGISTRATION: z.object({ procedure: z.enum(["CHANGE_OWNER", "DUPLICATE", "ADDRESS_CHANGE", "IMPORT", "TEMPORARY_REGISTRATION", "OTHER"]), registration: optional(30) }),
  ENGINE_CLEANING: z.object({ vehicle: z.string().trim().min(2).max(160), registration: optional(30), fuel: z.string().trim().min(1).max(50), engineSize: optional(50), mileage: z.coerce.number().int().min(0).max(2_000_000).optional(), reason: z.string().trim().min(2).max(1000) }),
  GENERAL_CONTACT: z.object({ subject: z.string().trim().min(2).max(120), contactPreference: optional(30) }),
  RENTAL: z.object({ subject: optional(120) }), WORKSHOP: z.object({ subject: optional(120) }), BODYWORK: z.object({ subject: optional(120) }),
}

export function validatePublicRequest(input: Record<string, unknown>) {
  const base = common.safeParse(input)
  if (!base.success) return base
  const details = detailSchemas[base.data.requestType].safeParse(input)
  if (!details.success) return details
  if (Date.now() - base.data.formStartedAt < 2_000 || base.data.website) {
    return { success: false as const, error: new z.ZodError([{ code: "custom", path: ["form"], message: "Envoi refusé." }]) }
  }
  return { success: true as const, data: { ...base.data, payload: details.data, requestType: base.data.requestType as PublicRequestType, source: base.data.source as PublicRequestSource } }
}
