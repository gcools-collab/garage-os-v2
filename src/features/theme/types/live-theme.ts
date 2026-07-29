export const LIVE_THEME_KEYS = [
  "default",
  "black-yellow",
  "midnight",
  "light-premium",
  "sport-red",
] as const

export type LiveThemeKey = typeof LIVE_THEME_KEYS[number]
export type LiveThemeMode = "light" | "dark"
export type LiveThemeStatus = "stable" | "preview" | "disabled"

export type LiveThemeTokens = {
  readonly background: string
  readonly foreground: string
  readonly mutedForeground: string
  readonly surface: string
  readonly surfaceElevated: string
  readonly surfaceMuted: string
  readonly border: string
  readonly borderStrong: string
  readonly primary: string
  readonly primaryForeground: string
  readonly primaryHover: string
  readonly secondary: string
  readonly secondaryForeground: string
  readonly accent: string
  readonly accentForeground: string
  readonly success: string
  readonly warning: string
  readonly danger: string
  readonly focusRing: string
  readonly overlay: string
  readonly shadowColor: string
}

export type LiveThemeDefinition = {
  readonly key: LiveThemeKey
  readonly label: string
  readonly description: string
  readonly mode: LiveThemeMode
  readonly tokens: LiveThemeTokens
  readonly preview: {
    readonly background: string
    readonly surface: string
    readonly primary: string
    readonly accent: string
  }
  readonly status: LiveThemeStatus
}

export type LiveThemeColorOverrides = {
  readonly primary?: string | null
  readonly secondary?: string | null
  readonly accent?: string | null
}

export type LiveThemeCssVariables = Readonly<Record<`--live-${string}`, string>>

export type LiveMetadataViewModel = {
  readonly title: string
  readonly description: string
  readonly icons: { readonly icon: string } | null
  readonly themeColor: string
}
