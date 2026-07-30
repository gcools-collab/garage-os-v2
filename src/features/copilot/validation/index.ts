import { z } from "zod"

export const CopilotInputSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(2, "Saisissez une question.").max(2_000, "La question est trop longue."),
})

export const CopilotConversationIdSchema = z.string().uuid()

const referenceSchema = z.object({
  entityType: z.enum(["LEAD", "VEHICLE", "COMMERCIAL_TASK", "RECOMMENDATION", "ACQUISITION_OPPORTUNITY", "NOTIFICATION"]),
  entityId: z.string().min(1).max(100),
  label: z.string().min(1).max(160),
  href: z.string().max(300),
}).strict()

const actionSchema = z.object({
  type: z.enum(["OPEN_LEAD", "OPEN_VEHICLE", "OPEN_COMMERCIAL", "OPEN_INTELLIGENCE", "OPEN_NOTIFICATION", "OPEN_ACQUISITION_OPPORTUNITY", "OPEN_BRANDING_SETTINGS", "OPEN_VEHICLE_EDIT"]),
  label: z.string().min(1).max(120),
  href: z.string().max(300),
  requiresConfirmation: z.boolean(),
}).strict()

export const CopilotStructuredResponseSchema = z.object({
  answer: z.string().min(1).max(6_000),
  summary: z.string().max(500).nullable(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  dataStatus: z.enum(["SUFFICIENT", "PARTIAL", "INSUFFICIENT"]),
  references: z.array(referenceSchema).max(10),
  suggestedActions: z.array(actionSchema).max(8),
  warnings: z.array(z.string().max(300)).max(8),
  followUpSuggestions: z.array(z.string().max(160)).max(6),
}).strict()
