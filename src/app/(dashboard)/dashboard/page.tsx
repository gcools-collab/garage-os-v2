import { redirect } from "next/navigation"

import { buildGarageDashboard, GarageIntelligenceDashboard } from "@/features/intelligence"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"

export default async function DashboardPage() {
  const session = await getActiveGarageSession()
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/dashboard") redirect(destination)
  if (!session) redirect("/register")
  if (!session.garageName) redirect("/select-garage")

  const dashboard = buildGarageDashboard({
    context: { garageName: session.garageName },
  })

  return <GarageIntelligenceDashboard dashboard={dashboard} />
}
