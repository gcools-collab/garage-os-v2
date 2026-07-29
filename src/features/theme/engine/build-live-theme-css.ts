import type { LiveThemeCssVariables, LiveThemeDefinition, LiveThemeTokens } from "../types"

export function buildLiveThemeCssVariables(
  theme: LiveThemeDefinition | LiveThemeTokens
): LiveThemeCssVariables {
  const tokens = "tokens" in theme ? theme.tokens : theme
  return {
    "--live-background": tokens.background,
    "--live-foreground": tokens.foreground,
    "--live-muted-foreground": tokens.mutedForeground,
    "--live-surface": tokens.surface,
    "--live-surface-elevated": tokens.surfaceElevated,
    "--live-surface-muted": tokens.surfaceMuted,
    "--live-border": tokens.border,
    "--live-border-strong": tokens.borderStrong,
    "--live-primary": tokens.primary,
    "--live-primary-foreground": tokens.primaryForeground,
    "--live-primary-hover": tokens.primaryHover,
    "--live-secondary": tokens.secondary,
    "--live-secondary-foreground": tokens.secondaryForeground,
    "--live-accent": tokens.accent,
    "--live-accent-foreground": tokens.accentForeground,
    "--live-success": tokens.success,
    "--live-warning": tokens.warning,
    "--live-danger": tokens.danger,
    "--live-focus-ring": tokens.focusRing,
    "--live-overlay": tokens.overlay,
    "--live-shadow-color": tokens.shadowColor,
    "--live-muted": tokens.surfaceMuted,
    "--live-surface-foreground": tokens.foreground,
  }
}
