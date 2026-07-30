import type { LeadStatus, LeadType } from "@/features/leads/types"

export const COMMERCIAL_TASK_TYPES = [
  "CALL_PROSPECT", "SEND_EMAIL", "FOLLOW_UP", "CONFIRM_APPOINTMENT",
  "PREPARE_TEST_DRIVE", "REQUEST_DOCUMENTS", "UPDATE_LEAD", "OTHER",
] as const
export type CommercialTaskType = typeof COMMERCIAL_TASK_TYPES[number]

export const COMMERCIAL_TASK_STATUSES = [
  "OPEN", "IN_PROGRESS", "COMPLETED", "SNOOZED", "CANCELLED",
] as const
export type CommercialTaskStatus = typeof COMMERCIAL_TASK_STATUSES[number]

export const COMMERCIAL_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const
export type CommercialPriority = typeof COMMERCIAL_PRIORITIES[number]

export const LEAD_LOSS_REASONS = [
  "NO_RESPONSE", "VEHICLE_SOLD", "PRICE", "FINANCING",
  "VEHICLE_NOT_SUITABLE", "BOUGHT_ELSEWHERE", "DUPLICATE", "OTHER",
] as const
export type LeadLossReason = typeof LEAD_LOSS_REASONS[number]

export type CommercialTaskRecord = {
  readonly id: string
  readonly garage_id: string
  readonly lead_id: string | null
  readonly vehicle_id: string | null
  readonly assigned_user_id: string | null
  readonly created_by_user_id: string | null
  readonly type: CommercialTaskType
  readonly status: CommercialTaskStatus
  readonly priority: CommercialPriority
  readonly title: string
  readonly description: string | null
  readonly due_at: string | null
  readonly completed_at: string | null
  readonly cancelled_at: string | null
  readonly snoozed_until: string | null
  readonly created_at: string
  readonly updated_at: string
}

export type LeadNoteRecord = {
  readonly id: string
  readonly garage_id: string
  readonly lead_id: string
  readonly author_user_id: string
  readonly content: string
  readonly created_at: string
  readonly updated_at: string | null
  readonly deleted_at: string | null
}

export type CommercialLeadRecord = {
  readonly id: string
  readonly garage_id: string
  readonly vehicle_id: string | null
  readonly customer_name: string
  readonly customer_phone: string | null
  readonly customer_email: string | null
  readonly vehicle_title_snapshot: string | null
  readonly type: LeadType
  readonly status: LeadStatus
  readonly created_at: string
  readonly first_contacted_at: string | null
  readonly last_contacted_at: string | null
  readonly next_action_at: string | null
  readonly assigned_user_id: string | null
  readonly preferred_date: string | null
}

export type CommercialMemberRecord = {
  readonly userId: string
  readonly name: string
}

export type CommercialInboxData = {
  readonly leads: readonly CommercialLeadRecord[]
  readonly tasks: readonly CommercialTaskRecord[]
  readonly members: readonly CommercialMemberRecord[]
}

export type LeadNextAction = {
  readonly type: CommercialTaskType | null
  readonly label: string
  readonly dueAt: string | null
  readonly priority: CommercialPriority
  readonly reason: string
}

export type CommercialTaskViewModel = {
  readonly id: string
  readonly leadId: string | null
  readonly title: string
  readonly typeLabel: string
  readonly statusLabel: string
  readonly priority: CommercialPriority
  readonly priorityLabel: string
  readonly dueLabel: string | null
  readonly overdue: boolean
  readonly assigneeLabel: string
  readonly href: string
  readonly reasons: readonly string[]
}

export type CommercialInboxItemViewModel = {
  readonly id: string
  readonly leadId: string
  readonly prospectName: string
  readonly vehicleTitle: string
  readonly statusLabel: string
  readonly priority: CommercialPriority
  readonly priorityLabel: string
  readonly actionLabel: string
  readonly dueLabel: string | null
  readonly assigneeLabel: string
  readonly href: string
  readonly reasons: readonly string[]
}

export type CommercialInboxViewModel = {
  readonly title: string
  readonly description: string
  readonly summary: {
    readonly newLeads: number
    readonly dueToday: number
    readonly overdue: number
    readonly appointmentsToConfirm: number
  }
  readonly urgentItems: readonly CommercialInboxItemViewModel[]
  readonly newLeads: readonly CommercialInboxItemViewModel[]
  readonly dueToday: readonly CommercialTaskViewModel[]
  readonly upcoming: readonly CommercialTaskViewModel[]
  readonly recentlyCompleted: readonly CommercialTaskViewModel[]
  readonly emptyMessage: string
}

export type CommercialDashboardSignalViewModel = {
  readonly newLeads: number
  readonly neverContacted: number
  readonly dueToday: number
  readonly overdue: number
  readonly appointmentsToConfirm: number
  readonly headline: string
  readonly recommendation: string | null
  readonly href: "/commercial"
}

export type CommercialLeadContext = {
  readonly tasks: readonly CommercialTaskRecord[]
  readonly notes: readonly LeadNoteRecord[]
  readonly members: readonly CommercialMemberRecord[]
}

export type CommercialLeadWorkspaceViewModel = {
  readonly leadId: string
  readonly assignedUserId: string | null
  readonly assignedUserLabel: string
  readonly nextAction: LeadNextAction & {
    readonly dueLabel: string | null
    readonly priorityLabel: string
  }
  readonly tasks: readonly CommercialTaskViewModel[]
  readonly notes: readonly {
    readonly id: string
    readonly content: string
    readonly authorLabel: string
    readonly dateLabel: string
    readonly canManage: boolean
  }[]
  readonly members: readonly CommercialMemberRecord[]
}
