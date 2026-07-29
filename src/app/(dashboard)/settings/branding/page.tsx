import { redirect } from "next/navigation"

import {
  BrandingSettingsForm,
  buildGarageBrandingSettingsViewModel,
  getActiveGarageBranding,
} from "@/features/branding"
import { updateActiveGarageBranding } from "@/features/branding/actions"

export default async function GarageBrandingSettingsPage() {
  const activeBranding = await getActiveGarageBranding()
  if (!activeBranding) redirect("/select-garage")
  const settings = buildGarageBrandingSettingsViewModel(activeBranding)

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{settings.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{settings.description}</p>
      </header>
      <BrandingSettingsForm settings={settings} updateBranding={updateActiveGarageBranding} />
    </div>
  )
}
