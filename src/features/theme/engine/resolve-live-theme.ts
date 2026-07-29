import { getLiveThemeDefinition } from "../registry"
import type {
  LiveThemeColorOverrides,
  LiveThemeDefinition,
  LiveThemeTokens,
} from "../types"
import { getReadableForegroundColor } from "./color-contrast"

function validColor(value: string | null | undefined) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toUpperCase()
    : null
}

export function resolveLiveTheme({
  themeKey,
  colors,
  allowColorOverrides = true,
}: {
  readonly themeKey?: string | null
  readonly colors?: LiveThemeColorOverrides | null
  readonly allowColorOverrides?: boolean
}): LiveThemeDefinition {
  const base = getLiveThemeDefinition(themeKey)
  if (!allowColorOverrides || !colors) return base

  const primary = validColor(colors.primary)
  const secondary = validColor(colors.secondary)
  const accent = validColor(colors.accent)
  if (!primary && !secondary && !accent) return base

  const tokens: LiveThemeTokens = {
    ...base.tokens,
    primary: primary ?? base.tokens.primary,
    primaryForeground: primary
      ? getReadableForegroundColor(primary)
      : base.tokens.primaryForeground,
    secondary: secondary ?? base.tokens.secondary,
    secondaryForeground: secondary
      ? getReadableForegroundColor(secondary)
      : base.tokens.secondaryForeground,
    accent: accent ?? base.tokens.accent,
    accentForeground: accent
      ? getReadableForegroundColor(accent)
      : base.tokens.accentForeground,
  }

  return {
    ...base,
    tokens,
    preview: {
      ...base.preview,
      primary: tokens.primary,
      accent: tokens.accent,
    },
  }
}
