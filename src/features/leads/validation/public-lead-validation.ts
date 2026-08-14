import { z } from "zod"
import { LEAD_TYPES, type PublicLeadInput } from "../types"

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null)

const publicLeadSchema = z.object({
  garageSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  vehicleSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(LEAD_TYPES),
  customerName: z.string().trim().min(2).max(100)
    .transform((value) => value.replace(/\s+/g, " ")),
  customerPhone: optionalText(30).refine(
    (value) => value === null || /^\+?[\d\s().-]{6,30}$/.test(value),
    "Numéro de téléphone invalide."
  ),
  customerEmail: optionalText(254).refine(
    (value) => value === null || z.email().safeParse(value.toLowerCase()).success,
    "Adresse e-mail invalide."
  ).transform((value) => value?.toLowerCase() ?? null),
  preferredDate: optionalText(10).refine((value) => {
    if (value === null) return true
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`))
  }, "Date invalide."),
  preferredTime: optionalText(50),
  message: optionalText(2000),
  consentContact: z.literal(true, "Votre accord est nécessaire pour être recontacté."),
  consentMarketing: z.boolean(),
  website: z.string().max(200),
  formStartedAt: z.number().int().positive(),
  publicPageUrl: z.string().trim().max(500),
}).superRefine((value, context) => {
  if (!value.customerPhone && !value.customerEmail) {
    const message = "Renseignez un téléphone ou une adresse e-mail."
    context.addIssue({ code: "custom", path: ["customerPhone"], message })
    context.addIssue({ code: "custom", path: ["customerEmail"], message })
  }
})

export function normalizePhone(value: string) {
  const trimmed = value.trim()
  const prefix = trimmed.startsWith("+") ? "+" : ""
  return prefix + trimmed.replace(/\D/g, "")
}

export function parsePublicLeadInput(formData: FormData): PublicLeadInput {
  const text = (name: string) => String(formData.get(name) ?? "")
  return {
    garageSlug: text("garageSlug"),
    vehicleSlug: text("vehicleSlug"),
    type: text("type"),
    customerName: text("customerName"),
    customerPhone: text("customerPhone"),
    customerEmail: text("customerEmail"),
    preferredDate: text("preferredDate"),
    preferredTime: text("preferredTime"),
    message: text("message"),
    consentContact: formData.get("consentContact") === "on",
    consentMarketing: formData.get("consentMarketing") === "on",
    website: text("website"),
    formStartedAt: Number(text("formStartedAt")),
    publicPageUrl: text("publicPageUrl"),
  }
}

export function validatePublicLead(input: PublicLeadInput, today = new Date()) {
  const result = publicLeadSchema.safeParse(input)
  if (!result.success) return result
  if (result.data.preferredDate) {
    const selected = Date.parse(`${result.data.preferredDate}T23:59:59`)
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    if (selected < startOfToday) {
      return {
        success: false as const,
        error: new z.ZodError([{
          code: "custom", path: ["preferredDate"], message: "La date doit être future.",
        }]),
      }
    }
  }
  return {
    success: true as const,
    data: {
      ...result.data,
      customerPhone: result.data.customerPhone
        ? normalizePhone(result.data.customerPhone)
        : null,
    },
  }
}

export function validateLeadContactability(input: PublicLeadInput) {
  const result = validatePublicLead({ ...input, preferredDate: "" }, new Date(0))
  return {
    valid: result.success,
    errors: result.success ? [] : result.error.issues.map((issue) => issue.message),
  }
}
