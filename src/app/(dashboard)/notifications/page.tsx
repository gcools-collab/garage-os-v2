import { redirect } from "next/navigation"
import {
  buildNotificationCenter,
  getGarageNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  NotificationList,
} from "@/features/notifications"
import { getActiveGarageSession } from "@/features/tenant"
import { Button } from "@/components/ui/button"

export default async function NotificationsPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const [notifications, unreadCount] = await Promise.all([
    getGarageNotifications(session),
    getUnreadNotificationCount(session),
  ])
  const center = buildNotificationCenter(notifications, unreadCount)
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-semibold tracking-tight">Notifications</h1><p className="mt-2 text-muted-foreground">Suivez les événements importants de votre garage.</p></div>
        {unreadCount ? <form action={markAllNotificationsRead}><Button variant="outline">Tout marquer comme lu</Button></form> : null}
      </header>
      <NotificationList center={center} />
    </div>
  )
}
