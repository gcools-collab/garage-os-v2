import type { Theme } from "../types"

export const defaultTheme: Theme = {
  id: "garage-os-default",
  name: "Garage OS Default",
  colors: {
    background: "#09090b",
    foreground: "#fafafa",
    surface: "#18181b",
    surfaceForeground: "#fafafa",
    primary: "#fafafa",
    primaryForeground: "#18181b",
    muted: "#27272a",
    mutedForeground: "#a1a1aa",
    border: "#3f3f46",
  },
  typography: {
    fontFamily: "var(--font-sans)",
    headingWeight: 700,
    bodyWeight: 400,
  },
  radius: {
    card: "1rem",
    control: "0.625rem",
  },
  layout: {
    contentMaxWidth: "80rem",
  },
}
