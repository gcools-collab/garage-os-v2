import { redirect } from "next/navigation"
import { AppointmentCalendarBuilder, AppointmentDashboardSignal, AppointmentList, buildAppointmentDashboardSummary, getAppointments } from "@/features/scheduling"
import { getActiveGarageSession } from "@/features/tenant"

export default async function AppointmentsPage() {
  const session = await getActiveGarageSession(); if (!session?.garageId) redirect("/login")
  const rows = await getAppointments(session.garageId); const items = new AppointmentCalendarBuilder().build(rows); const summary = buildAppointmentDashboardSummary(rows, new Date())
  return <main className="space-y-6"><header><h1 className="text-3xl font-semibold">Agenda</h1><p className="text-muted-foreground">Rendez-vous du garage, demandes à confirmer et prestations à venir.</p></header><AppointmentDashboardSignal summary={summary}/><AppointmentList items={items}/></main>
}
