import Link from "next/link"
import { redirect } from "next/navigation"
import { AppointmentCalendarBuilder, AppointmentDashboardSignal, AppointmentList, buildAppointmentDashboardSummary, getAppointments } from "@/features/scheduling"
import { getActiveGarageSession } from "@/features/tenant"

export default async function AppointmentsPage() {
  const session = await getActiveGarageSession(); if (!session?.garageId) redirect("/login")
  const rows = await getAppointments(session.garageId); const items = new AppointmentCalendarBuilder().build(rows); const summary = buildAppointmentDashboardSummary(rows, new Date())
  return <main className="space-y-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold">Agenda</h1><p className="text-muted-foreground">Rendez-vous du garage, demandes à confirmer et prestations à venir.</p></div><Link href="/customers" className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium">Créer via un client</Link></header><AppointmentDashboardSignal summary={summary}/><AppointmentList items={items}/></main>
}
