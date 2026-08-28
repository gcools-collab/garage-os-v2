import Link from "next/link"

import { Badge } from "@/components/ui/badge"

import type { AppointmentCalendarBuilder } from "../builders/scheduling-builders"

type Item = ReturnType<AppointmentCalendarBuilder["build"]>[number]

export function AppointmentList({ items }: { readonly items: readonly Item[] }) {
  if (items.length === 0) {
    return <p className="rounded-xl border bg-white p-6 text-muted-foreground">Aucun rendez-vous.</p>
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article key={item.id} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[12rem_1fr_10rem] sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{item.dateLabel}</strong>
            <span className="text-sm text-muted-foreground">{item.timeLabel}</span>
            {item.isToday ? <Badge>Aujourd&apos;hui</Badge> : null}
            {item.isHistorical ? <Badge variant="secondary">Historique importé</Badge> : null}
          </div>
          <div className="min-w-0">
            <p className="font-medium">{item.customerName} · {item.typeLabel}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {item.href ? <Link href={item.href} className="underline">Ouvrir le rendez-vous</Link> : null}
              {item.customerHref ? <Link href={item.customerHref} className="underline">Fiche client</Link> : null}
            </div>
          </div>
          <span className="text-sm font-medium sm:text-right">{item.statusLabel}</span>
        </article>
      ))}
    </div>
  )
}
