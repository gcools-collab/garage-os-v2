import { leadStatusLabels } from "@/features/leads/builders"
import {
  computeCommercialTaskPriority,
  computeLeadNextAction,
  resolveEffectiveTaskStatus,
} from "../engine"
import {
  commercialPriorityLabels,
  commercialTaskStatusLabels,
  commercialTaskTypeLabels,
  formatCommercialDate,
  formatCommercialDelay,
} from "../presentation"
import type {
  CommercialDashboardSignalViewModel,
  CommercialInboxData,
  CommercialInboxItemViewModel,
  CommercialInboxViewModel,
  CommercialLeadRecord,
  CommercialLeadWorkspaceViewModel,
  CommercialLeadContext,
  CommercialTaskRecord,
  CommercialTaskViewModel,
} from "../types"

const priorityRank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const

function memberName(data: CommercialInboxData, userId: string | null) {
  if (!userId) return "Non attribué"
  return data.members.find((member) => member.userId === userId)?.name ?? "Membre du garage"
}

function taskViewModel(
  task: CommercialTaskRecord,
  data: CommercialInboxData,
  now: Date
): CommercialTaskViewModel {
  const lead = task.lead_id ? data.leads.find((candidate) => candidate.id === task.lead_id) : null
  const effectiveStatus = resolveEffectiveTaskStatus(task, now)
  const computed = computeCommercialTaskPriority({
    dueAt: task.due_at,
    leadNeverContacted: lead?.first_contacted_at === null,
    leadType: lead?.type ?? null,
    createdAt: task.created_at,
    vehicleAvailable: lead ? Boolean(lead.vehicle_id) : true,
    now,
  })
  const overdue = task.due_at !== null
    && Date.parse(task.due_at) < now.getTime()
    && !["COMPLETED", "CANCELLED"].includes(effectiveStatus)
  return {
    id: task.id,
    leadId: task.lead_id,
    title: task.title,
    typeLabel: commercialTaskTypeLabels[task.type],
    statusLabel: commercialTaskStatusLabels[effectiveStatus],
    priority: computed.priority,
    priorityLabel: commercialPriorityLabels[computed.priority],
    dueLabel: task.due_at
      ? overdue ? formatCommercialDelay(task.due_at, now) : formatCommercialDate(task.due_at, now)
      : null,
    overdue,
    assigneeLabel: memberName(data, task.assigned_user_id),
    href: task.lead_id ? `/leads/${task.lead_id}` : "/commercial",
    reasons: computed.reasons,
  }
}

function leadViewModel(
  lead: CommercialLeadRecord,
  data: CommercialInboxData,
  now: Date
): CommercialInboxItemViewModel {
  const tasks = data.tasks.filter((task) => task.lead_id === lead.id)
  const action = computeLeadNextAction({
    status: lead.status,
    type: lead.type,
    firstContactedAt: lead.first_contacted_at,
    tasks,
    preferredDate: lead.preferred_date,
    vehicleAvailable: Boolean(lead.vehicle_id),
    now,
  })
  return {
    id: lead.id,
    leadId: lead.id,
    prospectName: lead.customer_name,
    vehicleTitle: lead.vehicle_title_snapshot ?? "Demande générale",
    statusLabel: leadStatusLabels[lead.status],
    priority: action.priority,
    priorityLabel: commercialPriorityLabels[action.priority],
    actionLabel: action.label,
    dueLabel: action.dueAt ? (
      Date.parse(action.dueAt) < now.getTime()
        ? formatCommercialDelay(action.dueAt, now)
        : formatCommercialDate(action.dueAt, now)
    ) : null,
    assigneeLabel: memberName(data, lead.assigned_user_id),
    href: `/leads/${lead.id}`,
    reasons: [action.reason],
  }
}

export function buildCommercialInbox(
  data: CommercialInboxData,
  now = new Date()
): CommercialInboxViewModel {
  const tasks = data.tasks.map((task) => taskViewModel(task, data, now))
  const leads = data.leads.map((lead) => leadViewModel(lead, data, now))
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const activeTasks = data.tasks.filter((task) =>
    !["COMPLETED", "CANCELLED"].includes(resolveEffectiveTaskStatus(task, now))
  )
  const dueTodayIds = new Set(activeTasks.filter((task) =>
    task.due_at !== null
    && Date.parse(task.due_at) >= now.getTime()
    && Date.parse(task.due_at) <= todayEnd.getTime()
  ).map((task) => task.id))
  const overdueIds = new Set(activeTasks.filter((task) =>
    task.due_at !== null && Date.parse(task.due_at) < now.getTime()
  ).map((task) => task.id))
  const urgentItems = leads
    .filter((lead) => lead.priority !== "LOW" && (
      ["NEW", "TO_CONTACT"].includes(data.leads.find((item) => item.id === lead.id)?.status ?? "")
      || lead.priority === "URGENT"
      || lead.priority === "HIGH"
    ))
    .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority])
  return {
    title: "Boîte commerciale",
    description: "Bonjour, voici vos priorités commerciales.",
    summary: {
      newLeads: data.leads.filter((lead) => lead.status === "NEW").length,
      dueToday: dueTodayIds.size,
      overdue: overdueIds.size,
      appointmentsToConfirm: activeTasks.filter((task) => task.type === "CONFIRM_APPOINTMENT").length,
    },
    urgentItems,
    newLeads: leads.filter((lead) =>
      data.leads.find((item) => item.id === lead.id)?.status === "NEW"
    ),
    dueToday: tasks.filter((task) => dueTodayIds.has(task.id)),
    upcoming: tasks.filter((task) => {
      const record = data.tasks.find((item) => item.id === task.id)
      return record !== undefined
        && record.due_at !== null
        && Date.parse(record.due_at) > todayEnd.getTime()
        && !["COMPLETED", "CANCELLED"].includes(record.status)
    }),
    recentlyCompleted: tasks.filter((task) =>
      data.tasks.find((item) => item.id === task.id)?.status === "COMPLETED"
    ).slice(0, 5),
    emptyMessage: "Tout est à jour. Aucun prospect n’attend de réponse.",
  }
}

export function buildCommercialDashboardSignal(
  data: CommercialInboxData,
  now = new Date()
): CommercialDashboardSignalViewModel {
  const inbox = buildCommercialInbox(data, now)
  const mostUrgent = inbox.urgentItems[0]
  return {
    newLeads: inbox.summary.newLeads,
    neverContacted: data.leads.filter((lead) =>
      lead.first_contacted_at === null && !["WON", "LOST", "ARCHIVED"].includes(lead.status)
    ).length,
    dueToday: inbox.summary.dueToday,
    overdue: inbox.summary.overdue,
    appointmentsToConfirm: inbox.summary.appointmentsToConfirm,
    headline: inbox.summary.overdue > 0
      ? `${inbox.summary.overdue} rappel${inbox.summary.overdue > 1 ? "s sont" : " est"} en retard.`
      : inbox.summary.newLeads > 0
        ? `${inbox.summary.newLeads} nouveau${inbox.summary.newLeads > 1 ? "x prospects attendent" : " prospect attend"} une réponse.`
        : "Aucune priorité commerciale urgente.",
    recommendation: mostUrgent
      ? `Priorité : ${mostUrgent.actionLabel.toLowerCase()} — ${mostUrgent.prospectName}, ${mostUrgent.vehicleTitle}.`
      : null,
    href: "/commercial",
  }
}

export function buildCommercialLeadWorkspace(input: {
  readonly lead: CommercialLeadRecord
  readonly context: CommercialLeadContext
  readonly currentUserId: string
  readonly now?: Date
}): CommercialLeadWorkspaceViewModel {
  const now = input.now ?? new Date()
  const data: CommercialInboxData = {
    leads: [input.lead],
    tasks: input.context.tasks,
    members: input.context.members,
  }
  const action = computeLeadNextAction({
    status: input.lead.status,
    type: input.lead.type,
    firstContactedAt: input.lead.first_contacted_at,
    tasks: input.context.tasks,
    preferredDate: input.lead.preferred_date,
    vehicleAvailable: Boolean(input.lead.vehicle_id),
    now,
  })
  const assigned = input.context.members.find(
    (member) => member.userId === input.lead.assigned_user_id
  )
  return {
    leadId: input.lead.id,
    assignedUserId: input.lead.assigned_user_id,
    assignedUserLabel: assigned?.name ?? "Non attribué",
    nextAction: {
      ...action,
      dueLabel: action.dueAt ? formatCommercialDate(action.dueAt, now) : null,
      priorityLabel: commercialPriorityLabels[action.priority],
    },
    tasks: input.context.tasks.map((task) => taskViewModel(task, data, now)),
    notes: input.context.notes.map((note) => ({
      id: note.id,
      content: note.content,
      authorLabel: input.context.members.find((member) => member.userId === note.author_user_id)?.name
        ?? "Membre du garage",
      dateLabel: formatCommercialDate(note.created_at, now),
      canManage: note.author_user_id === input.currentUserId,
    })),
    members: input.context.members,
  }
}
