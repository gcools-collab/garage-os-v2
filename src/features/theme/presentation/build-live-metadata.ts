import type { LiveMetadataViewModel, LiveThemeDefinition } from "../types"

export type LiveMetadataBranding = {
  readonly displayName: string
  readonly shortDescription: string | null
  readonly faviconUrl: string | null
}

export function buildLiveMetadata({
  branding,
  theme,
  page,
}: {
  readonly branding: LiveMetadataBranding
  readonly theme: LiveThemeDefinition
  readonly page: {
    readonly title?: string | null
    readonly description?: string | null
  }
}): LiveMetadataViewModel {
  const pageTitle = page.title?.trim()
  return {
    title: pageTitle ? `${pageTitle} | ${branding.displayName}` : branding.displayName,
    description: page.description?.trim() || branding.shortDescription || `Découvrez ${branding.displayName}.`,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : null,
    themeColor: theme.tokens.background,
  }
}
