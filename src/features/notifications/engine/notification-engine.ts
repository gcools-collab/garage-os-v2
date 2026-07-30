import type {
  NotificationChannel,
  NotificationDispatchResult,
  NotificationType,
} from "../types"

export function isSafeInternalNotificationHref(href: string | null) {
  return href !== null && href.startsWith("/") && !href.startsWith("//")
}

export function buildNotificationCommand(input: {
  readonly type: NotificationType
  readonly leadId: string
  readonly vehicleTitle: string
  readonly assigneeName?: string
}) {
  if (input.type === "NEW_LEAD") {
    return {
      type: input.type,
      title: "Nouveau prospect",
      message: `Une nouvelle demande concerne ${input.vehicleTitle}.`,
      href: `/leads/${input.leadId}`,
      entityType: "lead" as const,
      entityId: input.leadId,
    }
  }
  return {
    type: input.type,
    title: "Prospect attribué",
    message: input.assigneeName
      ? `Le suivi a été attribué à ${input.assigneeName}.`
      : "Le suivi du prospect a été attribué.",
    href: `/leads/${input.leadId}`,
    entityType: "lead" as const,
    entityId: input.leadId,
  }
}

export function dispatchInAppNotification(
  requestedChannels: readonly NotificationChannel[]
): NotificationDispatchResult {
  return {
    deliveredChannels: requestedChannels.includes("IN_APP") ? ["IN_APP"] : [],
    skippedChannels: requestedChannels.filter((channel) => channel !== "IN_APP"),
  }
}

export function canReadNotification(input: {
  readonly member: boolean
  readonly currentUserId: string
  readonly recipientUserId: string | null
  readonly role: string | null
}) {
  if (!input.member) return false
  return input.recipientUserId === null
    || input.recipientUserId === input.currentUserId
    || input.role === "owner"
    || input.role === "admin"
}
