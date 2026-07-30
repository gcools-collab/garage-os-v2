import { z } from "zod"

export const actionProposalSchema = z.object({
  action: z.enum(["OPEN_ENTITY", "CREATE_TASK", "CHANGE_PRICE", "CHANGE_STATUS", "MARK_CONTACTED"]),
  targetId: z.uuid(),
  payload: z.record(z.string(), z.unknown()),
  explanation: z.string().trim().min(3).max(500),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
}).strict()

export const actionDecisionSchema = z.object({ proposalId: z.uuid() }).strict()

export const openEntityPayloadSchema = z.object({
  entityType: z.enum(["VEHICLE", "LEAD", "COMMERCIAL_TASK"]),
}).strict()

export const createTaskPayloadSchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.enum([
    "CALL_PROSPECT", "SEND_EMAIL", "FOLLOW_UP", "CONFIRM_APPOINTMENT",
    "PREPARE_TEST_DRIVE", "REQUEST_DOCUMENTS", "UPDATE_LEAD", "OTHER",
  ]),
  dueAt: z.iso.datetime(),
  description: z.string().trim().max(2000).nullable().optional(),
}).strict()

export const changePricePayloadSchema = z.object({
  newPrice: z.number().positive().max(10_000_000),
  reason: z.string().trim().min(3).max(300),
}).strict()

export const changeStatusPayloadSchema = z.object({
  newStatus: z.enum([
    "PURCHASED", "PREPARATION", "READY_TO_PUBLISH", "PUBLISHED", "RESERVED",
    "SOLD", "DELIVERED", "ARCHIVED", "CANCELLED",
  ]),
}).strict()

export const markContactedPayloadSchema = z.object({
  note: z.string().trim().max(500).nullable().optional(),
}).strict()
