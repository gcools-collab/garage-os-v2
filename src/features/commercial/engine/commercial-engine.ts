import type { GarageMemberRole } from "@/features/tenant/types"
import type {
  CommercialPriority,
  CommercialTaskRecord,
  CommercialTaskStatus,
  CommercialTaskType,
  LeadNextAction,
} from "../types"
import type { LeadStatus, LeadType } from "@/features/leads/types"

const transitions: Readonly<Record<CommercialTaskStatus, readonly CommercialTaskStatus[]>> = {
  OPEN: ["IN_PROGRESS", "COMPLETED", "SNOOZED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "SNOOZED", "CANCELLED"],
  SNOOZED: ["OPEN", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

export function canTransitionCommercialTaskStatus(
  from: CommercialTaskStatus,
  to: CommercialTaskStatus
) {
  return transitions[from].includes(to)
}

export function resolveEffectiveTaskStatus(
  task: Pick<CommercialTaskRecord, "status" | "snoozed_until">,
  now: Date
): CommercialTaskStatus {
  return task.status === "SNOOZED"
    && task.snoozed_until !== null
    && Date.parse(task.snoozed_until) <= now.getTime()
    ? "OPEN"
    : task.status
}

export function computeCommercialTaskPriority(input: {
  readonly dueAt: string | null
  readonly leadNeverContacted: boolean
  readonly leadType: LeadType | null
  readonly createdAt: string
  readonly vehicleAvailable: boolean
  readonly now: Date
}): { readonly priority: CommercialPriority; readonly reasons: readonly string[] } {
  const reasons: string[] = []
  const overdue = input.dueAt !== null && Date.parse(input.dueAt) < input.now.getTime()
  const ageHours = (input.now.getTime() - Date.parse(input.createdAt)) / 3_600_000
  if (overdue) reasons.push("Action en retard")
  if (input.leadNeverContacted) reasons.push("Prospect jamais contacté")
  if (input.leadType === "APPOINTMENT_REQUEST") reasons.push("Rendez-vous à confirmer")
  if (input.leadType === "TEST_DRIVE_REQUEST") reasons.push("Demande d’essai")
  if (!input.vehicleAvailable) reasons.push("Disponibilité du véhicule à vérifier")
  if (overdue && input.leadNeverContacted && ageHours >= 24) {
    return { priority: "URGENT", reasons }
  }
  if (overdue || input.leadType === "APPOINTMENT_REQUEST" || input.leadType === "TEST_DRIVE_REQUEST") {
    return { priority: "HIGH", reasons }
  }
  if (!input.leadNeverContacted && input.dueAt === null) {
    return { priority: "LOW", reasons: ["Aucune échéance proche"] }
  }
  return { priority: "NORMAL", reasons }
}

const initialTask: Readonly<Record<LeadType, {
  readonly type: CommercialTaskType
  readonly title: string
}>> = {
  CALLBACK_REQUEST: { type: "CALL_PROSPECT", title: "Appeler le prospect" },
  APPOINTMENT_REQUEST: { type: "CONFIRM_APPOINTMENT", title: "Confirmer le rendez-vous" },
  TEST_DRIVE_REQUEST: { type: "PREPARE_TEST_DRIVE", title: "Organiser l’essai" },
  VEHICLE_QUESTION: { type: "SEND_EMAIL", title: "Répondre à la demande" },
  PRICE_INQUIRY: { type: "FOLLOW_UP", title: "Recontacter le prospect" },
  GENERAL_INQUIRY: { type: "UPDATE_LEAD", title: "Traiter la demande" },
}

export function computeInitialTaskDueAt(createdAt: string): string {
  const created = new Date(createdAt)
  const hour = created.getUTCHours()
  const day = created.getUTCDay()
  if (day >= 1 && day <= 5 && hour >= 7 && hour < 17) {
    return new Date(created.getTime() + 2 * 3_600_000).toISOString()
  }
  const next = new Date(created)
  next.setUTCDate(next.getUTCDate() + (day === 5 ? 3 : day === 6 ? 2 : 1))
  next.setUTCHours(8, 0, 0, 0)
  return next.toISOString()
}

export function buildInitialCommercialTask(input: {
  readonly leadType: LeadType
  readonly createdAt: string
  readonly leadId: string
  readonly vehicleId: string | null
}) {
  const definition = initialTask[input.leadType]
  return {
    leadId: input.leadId,
    vehicleId: input.vehicleId,
    type: definition.type,
    title: definition.title,
    dueAt: computeInitialTaskDueAt(input.createdAt),
    priority: input.leadType === "APPOINTMENT_REQUEST" || input.leadType === "TEST_DRIVE_REQUEST"
      ? "HIGH" as const
      : "NORMAL" as const,
  }
}

export function computeLeadNextAction(input: {
  readonly status: LeadStatus
  readonly type: LeadType
  readonly firstContactedAt: string | null
  readonly tasks: readonly CommercialTaskRecord[]
  readonly preferredDate: string | null
  readonly vehicleAvailable: boolean
  readonly now: Date
}): LeadNextAction {
  if (["WON", "LOST", "ARCHIVED"].includes(input.status)) {
    return { type: null, label: "Aucun suivi nécessaire", dueAt: null, priority: "LOW", reason: "Prospect clôturé" }
  }
  if (!input.vehicleAvailable) {
    return { type: "UPDATE_LEAD", label: "Vérifier la disponibilité du véhicule", dueAt: null, priority: "HIGH", reason: "Le véhicule lié n’est plus disponible" }
  }
  const active = input.tasks
    .filter((task) => ["OPEN", "IN_PROGRESS"].includes(resolveEffectiveTaskStatus(task, input.now)))
    .sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999"))[0]
  if (active) {
    return { type: active.type, label: active.title, dueAt: active.due_at, priority: active.priority, reason: "Première tâche commerciale ouverte" }
  }
  if (!input.firstContactedAt) {
    const definition = initialTask[input.type]
    return { type: definition.type, label: definition.title, dueAt: null, priority: "HIGH", reason: "Le prospect n’a jamais été contacté" }
  }
  if (input.preferredDate && input.status === "APPOINTMENT_PLANNED") {
    return { type: "CONFIRM_APPOINTMENT", label: "Confirmer le rendez-vous", dueAt: input.preferredDate, priority: "HIGH", reason: "Un rendez-vous est planifié" }
  }
  return { type: "FOLLOW_UP", label: "Planifier une relance", dueAt: null, priority: "NORMAL", reason: "Aucune prochaine action n’est planifiée" }
}

export function canManageCommercialTask(role: GarageMemberRole | null) {
  return role !== null && ["owner", "admin", "member"].includes(role)
}

export function canAssignLead(role: GarageMemberRole | null, targetIsCurrentUser: boolean) {
  return role !== null && (targetIsCurrentUser || ["owner", "admin"].includes(role))
}

export function canManageLeadNote(
  role: GarageMemberRole | null,
  authorUserId: string,
  currentUserId: string
) {
  return role !== null && (authorUserId === currentUserId || ["owner", "admin"].includes(role))
}
