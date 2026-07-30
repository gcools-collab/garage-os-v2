import { z } from "zod"
import {
  COMMERCIAL_TASK_STATUSES,
  COMMERCIAL_TASK_TYPES,
  LEAD_LOSS_REASONS,
} from "../types"

export const taskSchema = z.object({
  leadId: z.uuid().optional(),
  type: z.enum(COMMERCIAL_TASK_TYPES),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), "Date invalide"),
  assignedUserId: z.uuid().optional(),
})

export const taskStatusSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(COMMERCIAL_TASK_STATUSES),
  snoozedUntil: z.string().refine((value) => Number.isFinite(Date.parse(value)), "Date invalide").optional(),
})

export const leadNoteSchema = z.object({
  leadId: z.uuid(),
  noteId: z.uuid().optional(),
  content: z.string().trim().min(1).max(4000),
})

export const leadAssignmentSchema = z.object({
  leadId: z.uuid(),
  assignedUserId: z.uuid().optional(),
})

export const contactLogSchema = z.object({
  leadId: z.uuid(),
  channel: z.enum(["CALL", "EMAIL"]),
  outcome: z.enum(["ANSWERED", "NO_ANSWER", "MESSAGE_LEFT", "SENT"]),
  note: z.string().trim().max(2000).optional(),
  subject: z.string().trim().max(200).optional(),
  nextActionAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), "Date invalide").optional(),
})

export const closeLeadSchema = z.object({
  leadId: z.uuid(),
  outcome: z.enum(["WON", "LOST"]),
  lossReason: z.enum(LEAD_LOSS_REASONS).optional(),
  lossNote: z.string().trim().max(1000).optional(),
}).superRefine((value, context) => {
  if (value.outcome === "LOST" && !value.lossReason) {
    context.addIssue({ code: "custom", path: ["lossReason"], message: "Sélectionnez une raison." })
  }
  if (value.lossReason === "OTHER" && !value.lossNote) {
    context.addIssue({ code: "custom", path: ["lossNote"], message: "Précisez la raison." })
  }
})
