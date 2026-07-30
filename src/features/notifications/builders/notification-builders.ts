import { formatRelativeCommercialDate } from "@/features/commercial/presentation"
import { isSafeInternalNotificationHref } from "../engine"
import type {
  NotificationCenterViewModel,
  NotificationRecord,
  NotificationType,
} from "../types"

const labels: Readonly<Record<NotificationType, string>> = {
  NEW_LEAD: "Prospect",
  LEAD_ASSIGNED: "Attribution",
  TASK_DUE: "Tâche",
  TASK_OVERDUE: "Retard",
  APPOINTMENT_TO_CONFIRM: "Rendez-vous",
  FOLLOW_UP_DUE: "Relance",
  VEHICLE_UNAVAILABLE_FOR_LEAD: "Disponibilité",
  SYSTEM: "Système",
}

export function buildNotificationCenter(
  notifications: readonly NotificationRecord[],
  unreadCount: number,
  now = new Date()
): NotificationCenterViewModel {
  return {
    unreadCount,
    items: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      typeLabel: labels[notification.type],
      title: notification.title,
      message: notification.message,
      href: isSafeInternalNotificationHref(notification.href) ? notification.href as string : "/notifications",
      dateLabel: formatRelativeCommercialDate(notification.created_at, now),
      unread: notification.read_at === null,
    })),
    emptyMessage: "Vous n’avez aucune nouvelle notification.",
  }
}
