import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import {
  BrandingSettingsForm,
  buildGarageBrandingSettingsViewModel,
  getActiveGarageBranding,
  getActiveGarageBrandingMedia,
} from "@/features/branding"
import { removeGarageLogo, updateActiveGarageBranding, uploadGarageLogo } from "@/features/branding/actions"
import {
  listSelectableLiveThemes,
  LiveThemeSelector,
  resolveLiveTheme,
} from "@/features/theme"
import { updatePublicGarageSettings } from "@/features/live-stock"
import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"

export default async function GarageBrandingSettingsPage() {
  const activeBranding = await getActiveGarageBranding()
  if (!activeBranding) redirect("/select-garage")
  const media = await getActiveGarageBrandingMedia()
  const settings = buildGarageBrandingSettingsViewModel({ ...activeBranding, logoUrl: media?.logoUrl ?? null })
  const selectedTheme = resolveLiveTheme({
    themeKey: activeBranding.branding.themeKey,
    colors: activeBranding.branding.colors,
  })
  const supabase = await createClient()
  const garageSession = await getActiveGarageSession()
  const canPublishLive = garageSession?.memberRole === "owner"
  const { data: liveSettings } = await supabase
    .from("garages")
    .select("live_slug, live_enabled")
    .eq("id", activeBranding.branding.garageId)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{settings.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{settings.description}</p>
      </header>
      <BrandingSettingsForm
        settings={settings}
        updateBranding={updateActiveGarageBranding}
        uploadLogo={uploadGarageLogo}
        removeLogo={removeGarageLogo}
        themeSelector={
          <LiveThemeSelector
            themes={listSelectableLiveThemes()}
            selectedThemeKey={selectedTheme.key}
            disabled={!settings.canEdit}
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Publication Garage OS Live</CardTitle>
          <CardDescription>
            Activez explicitement le site public et conservez une adresse stable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updatePublicGarageSettings} className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-medium">
              Slug public
              <Input
                name="liveSlug"
                defaultValue={liveSettings?.live_slug ?? ""}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                disabled={!canPublishLive}
                required
              />
            </label>
            <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                name="liveEnabled"
                defaultChecked={liveSettings?.live_enabled ?? false}
                disabled={!canPublishLive}
                className="size-4"
              />
              Site Live actif
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!canPublishLive}>
                Enregistrer la publication
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
