import { redirect } from "next/navigation"

import { DashboardOverview, DashboardService } from "@/features/dashboard"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const dashboard = await new DashboardService(
    await createClient()
  ).getDashboard()

  if (!dashboard) redirect("/register")

  return <DashboardOverview data={dashboard} />
}
