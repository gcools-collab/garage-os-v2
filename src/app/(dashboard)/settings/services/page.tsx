import { redirect } from "next/navigation"

import { getActiveGarageSession } from "@/features/tenant"
import { buildGarageServiceSettingsViewModel } from "@/features/public-site/services"
import { updateActiveGarageServices } from "@/features/public-site/services/garage-service-actions"
import { GarageServiceSettingsForm } from "@/features/public-site/services/GarageServiceSettingsForm"
import { loadGarageServiceConfiguration } from "@/features/public-site/services/garage-service-repository"

export default async function GarageServicesSettingsPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const settings = buildGarageServiceSettingsViewModel(
    await loadGarageServiceConfiguration(session.garageId),
    session.memberRole === "owner" || session.memberRole === "admin",
  )
  return <main className="mx-auto max-w-5xl space-y-8 pb-8"><header><h1 className="text-3xl font-semibold tracking-tight">{settings.title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{settings.description}</p></header><GarageServiceSettingsForm settings={settings} updateServices={updateActiveGarageServices} /></main>
}
