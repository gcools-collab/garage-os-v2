import { redirect } from "next/navigation"

import { getActiveGarageSession } from "@/features/tenant"
import { buildGarageServiceSettingsViewModel } from "@/features/public-site/services"
import { updateActiveGarageServices } from "@/features/public-site/services/garage-service-actions"
import { GarageServiceSettingsForm } from "@/features/public-site/services/GarageServiceSettingsForm"
import { loadGarageServiceConfiguration } from "@/features/public-site/services/garage-service-repository"
import { logPublicRouteDiagnostic } from "@/features/public-site/lib"
import Link from "next/link"

export default async function GarageServicesSettingsPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const configuration = await loadGarageServiceConfiguration(session.garageId)
  logPublicRouteDiagnostic({
    route: "/settings/services",
    slug: session.garageSlug,
    garageId: session.garageId,
    liveSlug: session.garageSlug,
    activeGarageId: session.garageId,
    serviceCount: configuration.length,
    repositoryResult: "FOUND",
    reason: "active_garage_services_resolved",
  })
  const settings = buildGarageServiceSettingsViewModel(
    configuration,
    session.memberRole === "owner" || session.memberRole === "admin",
  )
  return <main className="mx-auto max-w-5xl space-y-8 pb-8"><header><h1 className="text-3xl font-semibold tracking-tight">{settings.title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{settings.description}</p><Link href="/settings/services/catalog" className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-medium">Configurer les prestations et tarifs</Link></header><GarageServiceSettingsForm settings={settings} updateServices={updateActiveGarageServices} /></main>
}
