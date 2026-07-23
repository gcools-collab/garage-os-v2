import type { Theme } from "../types"

export const defaultTheme: Theme = {
  id: "garage-os-default",
  name: "Garage OS Default",
  colors: {
    background: "#ffffff",
    foreground: "#18181b",
    surface: "#fafafa",
    surfaceForeground: "#18181b",
    primary: "#18181b",
    primaryForeground: "#ffffff",
    muted: "#f4f4f5",
    mutedForeground: "#71717a",
    border: "#e4e4e7",
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
