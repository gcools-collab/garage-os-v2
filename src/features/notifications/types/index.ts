export const NOTIFICATION_TYPES = [
  "NEW_LEAD", "LEAD_ASSIGNED", "TASK_DUE", "TASK_OVERDUE",
  "APPOINTMENT_TO_CONFIRM", "FOLLOW_UP_DUE",
  "VEHICLE_UNAVAILABLE_FOR_LEAD", "SYSTEM",
] as const
export type NotificationType = typeof NOTIFICATION_TYPES[number]

export const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "SMS", "PUSH", "WEBHOOK"] as const
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number]

export type NotificationRecord = {
  readonly id: string
  readonly garage_id: string
  readonly user_id: string | null
  readonly type: NotificationType
  readonly title: string
  readonly message: string
  readonly href: string | null
  readonly entity_type: string | null
  readonly entity_id: string | null
  readonly read_at: string | null
  readonly dismissed_at: string | null
  readonly created_at: string
}

export type NotificationViewModel = {
  readonly id: string
  readonly type: NotificationType
  readonly typeLabel: string
  readonly title: string
  readonly message: string
  readonly href: string
  readonly dateLabel: string
  readonly unread: boolean
}

export type NotificationCenterViewModel = {
  readonly unreadCount: number
  readonly items: readonly NotificationViewModel[]
  readonly emptyMessage: string
}

export type NotificationDispatchResult = {
  readonly deliveredChannels: readonly NotificationChannel[]
  readonly skippedChannels: readonly NotificationChannel[]
}
