import { redirect } from "next/navigation"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import {
  buildGarageBrandingShellViewModel,
  getActiveGarageBranding,
  getActiveGarageBrandingMedia,
  resolveGarageBranding,
} from "@/features/branding"
import {
  buildNotificationCenter,
  getGarageNotifications,
  getUnreadNotificationCount,
} from "@/features/notifications"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"

export default async function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const session = await getActiveGarageSession()
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/dashboard") redirect(destination)
  if (!session) redirect("/register")
  if (!session.garageId || !session.garageName) redirect("/select-garage")

  const fallbackBranding = resolveGarageBranding({
    garage: { id: session.garageId, name: session.garageName },
    record: null,
  })
  const activeBranding = await getActiveGarageBranding().catch(() => null)
  const media = activeBranding
    ? await getActiveGarageBrandingMedia().catch(() => null)
    : null
  const shellBranding = buildGarageBrandingShellViewModel(
    activeBranding?.branding ?? fallbackBranding,
    media ?? { logoUrl: null, faviconUrl: null }
  )
  const [recentNotifications, unreadNotificationCount] = await Promise.all([
    getGarageNotifications(session, { limit: 5 }),
    getUnreadNotificationCount(session),
  ])
  const notificationCenter = buildNotificationCenter(
    recentNotifications,
    unreadNotificationCount
  )

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar branding={shellBranding} />
      <div className="min-w-0 flex-1">
        <Header branding={shellBranding} notifications={notificationCenter} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
