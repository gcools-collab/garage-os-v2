import { BadgeCheck, Clock3, Handshake, Wrench } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardLifecycle } from "../types/dashboard"

export function LifecycleSummary({ lifecycle }: { lifecycle: DashboardLifecycle }) {
  const items = [
    { label: "En préparation", value: lifecycle.preparation, icon: Wrench, href: "/stock?status=PREPARATION" },
    { label: "Publiés", value: lifecycle.published, icon: BadgeCheck, href: "/stock?status=PUBLISHED" },
    { label: "Réservés", value: lifecycle.reserved, icon: Handshake, href: "/stock?status=RESERVED" },
    { label: "Vendus sur 30 jours", value: lifecycle.soldRecently, icon: Clock3, href: "/stock?status=SOLD" },
  ]

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Cycle de vie du stock</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {items.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between gap-2 text-muted-foreground"><span className="text-xs">{label}</span><Icon className="size-4" /></div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
