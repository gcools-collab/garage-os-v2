import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { markNotificationRead } from "../actions"
import type { NotificationCenterViewModel } from "../types"

export function NotificationList({ center }: { readonly center: NotificationCenterViewModel }) {
  if (!center.items.length) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">{center.emptyMessage}</CardContent></Card>
  }
  return (
    <div className="space-y-3">
      {center.items.map((item) => (
        <Card key={item.id} className={item.unread ? "ring-primary/30" : ""}>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.title}</p>
                <Badge variant="outline">{item.typeLabel}</Badge>
                {item.unread ? <Badge>Non lue</Badge> : null}
              </div>
              <p className="text-muted-foreground">{item.message}</p>
              <p className="text-xs text-muted-foreground">{item.dateLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              {item.unread ? (
                <form action={markNotificationRead}>
                  <input type="hidden" name="notificationId" value={item.id} />
                  <button className="text-sm underline underline-offset-4">Marquer comme lue</button>
                </form>
              ) : null}
              <Link href={item.href} className="text-sm font-medium underline underline-offset-4">Ouvrir</Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
