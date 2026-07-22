import { BadgeCheck, CalendarClock, CircleDollarSign, Handshake, Wrench, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { SectionHeading } from "./executive-summary"
import type { ExecutiveActivity } from "./types"

export function ActivitySummary({ activity }: { activity: ExecutiveActivity }) {
  const items: Array<{ label: string; count: number; href: string; icon: LucideIcon; tone?: "warning" | "danger" }> = [
    { label: "En préparation", count: activity.preparation, href: "/stock?status=PREPARATION", icon: Wrench },
    { label: "Publiés", count: activity.published, href: "/stock?status=PUBLISHED", icon: BadgeCheck },
    { label: "Réservés", count: activity.reserved, href: "/stock?status=RESERVED", icon: Handshake },
    { label: "Vendus", count: activity.sold, href: "/stock?status=SOLD", icon: CircleDollarSign },
    { label: "Publiés depuis +30 j", count: activity.publishedOver30Days, href: "/stock?status=PUBLISHED", icon: CalendarClock, tone: "warning" },
    { label: "Publiés depuis +60 j", count: activity.publishedOver60Days, href: "/stock?status=PUBLISHED", icon: CalendarClock, tone: "warning" },
    { label: "Publiés depuis +90 j", count: activity.publishedOver90Days, href: "/stock?status=PUBLISHED", icon: CalendarClock, tone: "danger" },
  ]

  return <section aria-labelledby="activity-title" className="space-y-4">
    <SectionHeading id="activity-title" title="Activité" description="La répartition du parc et l’ancienneté des annonces actuellement publiées." />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {items.map(({ label, count, href, icon: Icon, ...item }) => <Link key={label} href={href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Card className="h-full transition-colors group-hover:bg-muted/30">
          <CardContent>
            <div className="flex items-center justify-between gap-2"><Icon className={item.tone === "danger" && count > 0 ? "size-4 text-red-600" : item.tone === "warning" && count > 0 ? "size-4 text-orange-600" : "size-4 text-muted-foreground"} /><span className="text-2xl font-semibold tabular-nums">{count}</span></div>
            <p className="mt-3 text-xs text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      </Link>)}
    </div>
  </section>
}
