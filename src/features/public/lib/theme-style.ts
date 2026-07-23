import type { CSSProperties } from "react"
import type { Theme } from "../types"

type PublicThemeStyle = CSSProperties & Record<`--live-${string}`, string | number>

export function getPublicThemeStyle(theme: Theme): PublicThemeStyle {
  return {
    "--live-background": theme.colors.background,
    "--live-foreground": theme.colors.foreground,
    "--live-surface": theme.colors.surface,
    "--live-surface-foreground": theme.colors.surfaceForeground,
    "--live-primary": theme.colors.primary,
    "--live-primary-foreground": theme.colors.primaryForeground,
    "--live-muted": theme.colors.muted,
    "--live-muted-foreground": theme.colors.mutedForeground,
    "--live-border": theme.colors.border,
    "--live-font-family": theme.typography.fontFamily,
    "--live-heading-weight": theme.typography.headingWeight,
    "--live-body-weight": theme.typography.bodyWeight,
    "--live-card-radius": theme.radius.card,
    "--live-control-radius": theme.radius.control,
    "--live-content-width": theme.layout.contentMaxWidth,
  }
}
