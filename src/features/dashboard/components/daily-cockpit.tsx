import Link from "next/link"
import { ArrowRight, Bot, CalendarDays, CircleCheck, Sparkles, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  DashboardKpiViewModel,
  DashboardListItemViewModel,
} from "@/features/intelligence"
import type { LeadDashboardSummaryViewModel } from "@/features/leads"

const kpiTone = {
  neutral: "text-foreground",
  positive: "text-emerald-700",
  warning: "text-orange-700",
  danger: "text-red-700",
  info: "text-blue-700",
} as const

export type DailyCockpitPriority = {
  readonly action: string
  readonly reason: string
  readonly href: string
  readonly ctaLabel: string
}

export type DailyCockpitAppointments = {
  readonly today: number
  readonly upcoming: number
  readonly pending: number
  readonly awaitingPayment: number
}

export function DailyCockpit({
  greeting,
  garageName,
  headline,
  kpis,
  priority,
  emptyPriority,
  appointments,
  leads,
  alerts,
}: {
  readonly greeting: string
  readonly garageName: string
  readonly headline: string
  readonly kpis: readonly DashboardKpiViewModel[]
  readonly priority: DailyCockpitPriority | null
  readonly emptyPriority: { readonly title: string; readonly description: string } | null
  readonly appointments: DailyCockpitAppointments
  readonly leads: LeadDashboardSummaryViewModel
  readonly alerts: readonly DashboardListItemViewModel[]
}) {
  const visibleAlerts = alerts.slice(0, 3)
  const hiddenAlertCount = Math.max(0, alerts.length - visibleAlerts.length)

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-linear-to-br from-white via-white to-primary/8 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">{garageName}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{greeting}</h1>
            <p className="mt-2 text-muted-foreground">{headline}</p>
          </div>
          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link href="/copilot"><Bot aria-hidden="true" />Copilote</Link>
          </Button>
        </div>
      </section>

      <section aria-label="Indicateurs du jour" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.id}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${kpiTone[kpi.tone]}`}>{kpi.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="border-primary/20 bg-primary/4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            Prochaine action
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priority ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-semibold">{priority.action}</p>
                <p className="mt-1 text-sm text-muted-foreground">{priority.reason}</p>
              </div>
              <Button asChild className="min-h-11 w-full sm:w-auto">
                <Link href={priority.href}>{priority.ctaLabel} <ArrowRight aria-hidden="true" /></Link>
              </Button>
            </div>
          ) : (
            <div role="status">
              <p className="font-semibold">{emptyPriority?.title ?? "Tout est sous contrôle."}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {emptyPriority?.description ?? "Aucune priorité urgente n’a été détectée pour le moment."}
              </p>
              <Link href="/intelligence" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
                Voir les priorités
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4" aria-hidden="true" />
              Agenda
            </CardTitle>
            <Link href="/appointments" className="text-sm font-semibold underline underline-offset-4">Ouvrir</Link>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-muted-foreground">Aujourd’hui</dt><dd className="text-2xl font-semibold tabular-nums">{appointments.today}</dd></div>
              <div><dt className="text-xs text-muted-foreground">À venir</dt><dd className="text-2xl font-semibold tabular-nums">{appointments.upcoming}</dd></div>
              <div><dt className="text-xs text-muted-foreground">À confirmer</dt><dd className="text-2xl font-semibold tabular-nums">{appointments.pending}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Paiements en attente</dt><dd className="text-2xl font-semibold tabular-nums">{appointments.awaitingPayment}</dd></div>
            </dl>
            {appointments.today === 0 && appointments.pending === 0 ? (
              <p role="status" className="mt-4 text-sm text-muted-foreground">Aucun rendez-vous à traiter maintenant.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" aria-hidden="true" />
              Demandes clients
            </CardTitle>
            <Link href="/leads" className="text-sm font-semibold underline underline-offset-4">Ouvrir</Link>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-muted-foreground">Aujourd’hui</dt><dd className="text-2xl font-semibold tabular-nums">{leads.newTodayCount}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Essais</dt><dd className="text-2xl font-semibold tabular-nums">{leads.testDriveCount}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Reprises</dt><dd className="text-2xl font-semibold tabular-nums">{leads.tradeInCount}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Services</dt><dd className="text-2xl font-semibold tabular-nums">{leads.serviceRequestCount}</dd></div>
            </dl>
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              {leads.message ?? "Aucune demande en attente."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Alertes</CardTitle>
          <Link href="/intelligence" className="text-sm font-semibold underline underline-offset-4">Voir tout</Link>
        </CardHeader>
        <CardContent>
          {visibleAlerts.length === 0 ? (
            <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
              Aucune alerte active.
            </p>
          ) : (
            <ul className="space-y-3">
              {visibleAlerts.map((alert) => (
                <li key={alert.id} className="rounded-lg border px-3 py-3">
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                </li>
              ))}
            </ul>
          )}
          {hiddenAlertCount > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{hiddenAlertCount} autre{hiddenAlertCount > 1 ? "s" : ""} alerte{hiddenAlertCount > 1 ? "s" : ""} dans Priorités.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export function buildDailyCockpitKpis(
  stockKpis: readonly DashboardKpiViewModel[],
  appointments: DailyCockpitAppointments,
  leads: LeadDashboardSummaryViewModel,
): DashboardKpiViewModel[] {
  const selected = stockKpis.filter((kpi) =>
    kpi.id === "stock" || kpi.id === "stock-value" || kpi.id === "invested-capital" || kpi.id === "potential-margin"
  )
  return [
    ...selected,
    {
      id: "appointments-today",
      label: "Rendez-vous du jour",
      value: String(appointments.today),
      detail: appointments.pending ? `${appointments.pending} à confirmer` : "agenda du garage",
      tone: appointments.pending > 0 ? "warning" : "neutral",
    },
    {
      id: "leads-today",
      label: "Demandes du jour",
      value: String(leads.newTodayCount),
      detail: leads.toContactCount ? `${leads.toContactCount} à relancer` : "demandes clients",
      tone: leads.toContactCount > 0 ? "warning" : "neutral",
    },
  ]
}
