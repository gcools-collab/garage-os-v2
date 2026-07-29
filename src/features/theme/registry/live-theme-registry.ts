import type { LiveThemeDefinition, LiveThemeKey } from "../types"

export const LIVE_THEME_REGISTRY: Readonly<Record<LiveThemeKey, LiveThemeDefinition>> = {
  default: {
    key: "default",
    label: "Garage OS",
    description: "Une identité neutre, lumineuse et premium.",
    mode: "light",
    status: "stable",
    tokens: {
      background: "#F6F7F9", foreground: "#17191D", mutedForeground: "#626873",
      surface: "#FFFFFF", surfaceElevated: "#FFFFFF", surfaceMuted: "#ECEFF3",
      border: "#DDE1E7", borderStrong: "#B6BDC7",
      primary: "#17191D", primaryForeground: "#FFFFFF", primaryHover: "#30343A",
      secondary: "#E6E9EE", secondaryForeground: "#17191D",
      accent: "#44546A", accentForeground: "#FFFFFF",
      success: "#177245", warning: "#A45A00", danger: "#B42318",
      focusRing: "#44546A", overlay: "rgba(10, 12, 16, 0.62)", shadowColor: "rgba(20, 24, 31, 0.16)",
    },
    preview: { background: "#F6F7F9", surface: "#FFFFFF", primary: "#17191D", accent: "#44546A" },
  },
  "black-yellow": {
    key: "black-yellow",
    label: "Noir & Jaune",
    description: "Un univers automobile sombre relevé par un accent jaune maîtrisé.",
    mode: "dark",
    status: "stable",
    tokens: {
      background: "#090A0C", foreground: "#F5F5F2", mutedForeground: "#A7A8A3",
      surface: "#15171A", surfaceElevated: "#1D2024", surfaceMuted: "#24272C",
      border: "#30343A", borderStrong: "#4A4F57",
      primary: "#F2C811", primaryForeground: "#111208", primaryHover: "#FFD82E",
      secondary: "#26292E", secondaryForeground: "#F5F5F2",
      accent: "#F2C811", accentForeground: "#111208",
      success: "#4FBA78", warning: "#F0A33A", danger: "#E45D5D",
      focusRing: "#F2C811", overlay: "rgba(0, 0, 0, 0.72)", shadowColor: "rgba(0, 0, 0, 0.52)",
    },
    preview: { background: "#090A0C", surface: "#1D2024", primary: "#F2C811", accent: "#F2C811" },
  },
  midnight: {
    key: "midnight",
    label: "Midnight",
    description: "Bleu nuit profond et accent froid contemporain.",
    mode: "dark",
    status: "preview",
    tokens: {
      background: "#07111F", foreground: "#F2F7FF", mutedForeground: "#9BAEC5",
      surface: "#0E1B2D", surfaceElevated: "#15263D", surfaceMuted: "#1C304A",
      border: "#29405C", borderStrong: "#3B5879",
      primary: "#6CB6FF", primaryForeground: "#06111E", primaryHover: "#8CC6FF",
      secondary: "#1C304A", secondaryForeground: "#F2F7FF",
      accent: "#74D5D0", accentForeground: "#061616",
      success: "#55C995", warning: "#E9A94A", danger: "#F06B73",
      focusRing: "#6CB6FF", overlay: "rgba(2, 8, 18, 0.72)", shadowColor: "rgba(0, 5, 14, 0.55)",
    },
    preview: { background: "#07111F", surface: "#15263D", primary: "#6CB6FF", accent: "#74D5D0" },
  },
  "light-premium": {
    key: "light-premium",
    label: "Light Premium",
    description: "Blanc chaleureux, anthracite et détails raffinés.",
    mode: "light",
    status: "preview",
    tokens: {
      background: "#F7F5F1", foreground: "#22211F", mutedForeground: "#6C6861",
      surface: "#FFFFFF", surfaceElevated: "#FFFFFF", surfaceMuted: "#EEEAE3",
      border: "#DDD7CD", borderStrong: "#B9B0A3",
      primary: "#252421", primaryForeground: "#FFFFFF", primaryHover: "#403E39",
      secondary: "#E9E3DA", secondaryForeground: "#252421",
      accent: "#8A6A3D", accentForeground: "#FFFFFF",
      success: "#397A55", warning: "#9B641B", danger: "#A93D35",
      focusRing: "#8A6A3D", overlay: "rgba(26, 22, 17, 0.58)", shadowColor: "rgba(45, 38, 28, 0.14)",
    },
    preview: { background: "#F7F5F1", surface: "#FFFFFF", primary: "#252421", accent: "#8A6A3D" },
  },
  "sport-red": {
    key: "sport-red",
    label: "Sport Red",
    description: "Une base sombre dynamique avec un rouge sportif ponctuel.",
    mode: "dark",
    status: "preview",
    tokens: {
      background: "#0D0E10", foreground: "#F7F7F7", mutedForeground: "#AAAEB4",
      surface: "#181A1E", surfaceElevated: "#202329", surfaceMuted: "#292D34",
      border: "#353A43", borderStrong: "#505762",
      primary: "#C9363B", primaryForeground: "#FFFFFF", primaryHover: "#E5484D",
      secondary: "#2A2E35", secondaryForeground: "#F7F7F7",
      accent: "#E5484D", accentForeground: "#FFFFFF",
      success: "#52BC7A", warning: "#E7A33D", danger: "#F06468",
      focusRing: "#F06468", overlay: "rgba(3, 4, 6, 0.72)", shadowColor: "rgba(0, 0, 0, 0.5)",
    },
    preview: { background: "#0D0E10", surface: "#202329", primary: "#C9363B", accent: "#E5484D" },
  },
}

export function isLiveThemeKey(value: unknown): value is LiveThemeKey {
  return typeof value === "string" && Object.hasOwn(LIVE_THEME_REGISTRY, value)
}

export function getLiveThemeDefinition(themeKey: unknown): LiveThemeDefinition {
  return isLiveThemeKey(themeKey) ? LIVE_THEME_REGISTRY[themeKey] : LIVE_THEME_REGISTRY.default
}

export function listSelectableLiveThemes() {
  return Object.values(LIVE_THEME_REGISTRY).filter((theme) => theme.status !== "disabled")
}
