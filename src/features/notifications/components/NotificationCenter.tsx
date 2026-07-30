import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { markAllNotificationsRead, markNotificationRead } from "../actions"
import type { NotificationCenterViewModel } from "../types"

export function NotificationCenter({ center }: { readonly center: NotificationCenterViewModel }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Notifications${center.unreadCount ? `, ${center.unreadCount} non lues` : ""}`}
          className="relative"
        >
          <Bell aria-hidden="true" />
          {center.unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold text-white">
              {center.unreadCount > 99 ? "99+" : center.unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {center.unreadCount ? (
            <form action={markAllNotificationsRead}>
              <button className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Tout marquer comme lu
              </button>
            </form>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {center.items.length ? center.items.slice(0, 5).map((item) => (
          <div key={item.id} className="rounded-md p-2 hover:bg-muted">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.unread ? "bg-primary" : "bg-muted-foreground/30"}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <Link href={item.href} className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="block font-medium">{item.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{item.message}</span>
                  <span className="text-xs text-muted-foreground">{item.dateLabel}</span>
                </Link>
                {item.unread ? (
                  <form action={markNotificationRead} className="mt-1">
                    <input type="hidden" name="notificationId" value={item.id} />
                    <button className="text-xs underline underline-offset-2">Marquer comme lue</button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        )) : <p className="p-3 text-sm text-muted-foreground">{center.emptyMessage}</p>}
        <DropdownMenuSeparator />
        <Link href="/notifications" className="block rounded px-2 py-2 text-center text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Voir toutes les notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
