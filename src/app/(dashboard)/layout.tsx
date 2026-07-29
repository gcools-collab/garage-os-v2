import { redirect } from "next/navigation"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"

export default async function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await getActiveGarageSession()
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/dashboard") redirect(destination)
  if (!session) redirect("/register")
  if (!session.garageName) redirect("/select-garage")

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar garageName={session.garageName} />
      <div className="min-w-0 flex-1">
        <Header garageName={session.garageName} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
