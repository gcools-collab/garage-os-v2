import Link from "next/link"
import { AlertTriangle, CalendarClock, Clock3, UserRoundPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import type {
  CommercialInboxItemViewModel,
  CommercialInboxViewModel,
  CommercialTaskViewModel,
} from "../types"

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  readonly label: string
  readonly value: number
  readonly icon: typeof Clock3
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between">
        <div><p className="text-2xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
        <Icon className="text-muted-foreground" aria-hidden="true" />
      </CardContent>
    </Card>
  )
}

function LeadRows({ items }: { readonly items: readonly CommercialInboxItemViewModel[] }) {
  if (!items.length) return <p className="py-6 text-center text-muted-foreground">Aucun prospect à traiter dans cette section.</p>
  return (
    <div className="divide-y">
      {items.map((item) => (
        <article key={item.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <Badge variant={item.priority === "URGENT" ? "destructive" : "outline"}>{item.priorityLabel}</Badge>
          <div className="min-w-0">
            <p className="font-medium">{item.prospectName} — {item.vehicleTitle}</p>
            <p className="text-sm text-muted-foreground">{item.actionLabel}{item.dueLabel ? ` · ${item.dueLabel}` : ""}</p>
            <p className="text-xs text-muted-foreground">{item.assigneeLabel} · {item.reasons.join(" · ")}</p>
          </div>
          <Button asChild variant="outline"><Link href={item.href}>Ouvrir</Link></Button>
        </article>
      ))}
    </div>
  )
}

function TaskRows({ items, empty }: { readonly items: readonly CommercialTaskViewModel[]; readonly empty: string }) {
  if (!items.length) return <p className="py-5 text-center text-muted-foreground">{empty}</p>
  return (
    <div className="divide-y">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.dueLabel ?? "Sans échéance"} · {item.assigneeLabel}</p>
          </div>
          <Button asChild size="sm" variant="ghost"><Link href={item.href}>Ouvrir</Link></Button>
        </div>
      ))}
    </div>
  )
}

export function CommercialInbox({ inbox }: { readonly inbox: CommercialInboxViewModel }) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{inbox.title}</h1>
        <p className="mt-2 text-muted-foreground">{inbox.description}</p>
      </header>
      <section aria-label="Résumé commercial" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Nouveaux prospects" value={inbox.summary.newLeads} icon={UserRoundPlus} />
        <SummaryCard label="À faire aujourd’hui" value={inbox.summary.dueToday} icon={Clock3} />
        <SummaryCard label="En retard" value={inbox.summary.overdue} icon={AlertTriangle} />
        <SummaryCard label="Rendez-vous à confirmer" value={inbox.summary.appointmentsToConfirm} icon={CalendarClock} />
      </section>
      <Card>
        <CardHeader><CardTitle>À traiter maintenant</CardTitle><CardDescription>Les demandes classées par priorité métier.</CardDescription></CardHeader>
        <CardContent><LeadRows items={inbox.urgentItems} /></CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Nouveaux prospects</CardTitle></CardHeader><CardContent><LeadRows items={inbox.newLeads} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Rappels du jour</CardTitle></CardHeader><CardContent><TaskRows items={inbox.dueToday} empty="Aucune action commerciale prévue aujourd’hui." /></CardContent></Card>
        <Card><CardHeader><CardTitle>Prochainement</CardTitle></CardHeader><CardContent><TaskRows items={inbox.upcoming} empty="Aucune action planifiée prochainement." /></CardContent></Card>
        <Card><CardHeader><CardTitle>Récemment terminés</CardTitle></CardHeader><CardContent><TaskRows items={inbox.recentlyCompleted} empty="Aucune tâche terminée récemment." /></CardContent></Card>
      </div>
    </div>
  )
}
