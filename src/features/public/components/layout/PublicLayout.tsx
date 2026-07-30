import type { ReactNode } from "react"
import { LiveThemeProvider, resolveLiveTheme } from "@/features/theme"
import { getPublicLayoutStyle } from "../../lib/theme-style"
import type { LiveGarageViewModel, NavigationItem, Theme } from "../../types"
import { Footer } from "./Footer"
import { Header } from "./Header"

export function PublicLayout({
  children,
  garage,
  navigation,
  theme,
}: {
  children: ReactNode
  garage: LiveGarageViewModel
  navigation: NavigationItem[]
  theme: Theme
}) {
  const liveTheme = resolveLiveTheme({
    themeKey: theme.themeKey,
    colors: theme.colorOverrides,
  })

  return (
    <LiveThemeProvider
      theme={liveTheme}
      layoutStyle={getPublicLayoutStyle(theme)}
      className="flex min-h-screen flex-col bg-[var(--live-background)] font-[family-name:var(--live-font-family)] font-[var(--live-body-weight)] text-[var(--live-foreground)]"
    >
      <Header garage={garage} navigation={navigation} />
      <main className="flex-1">{children}</main>
      <Footer garage={garage} />
    </LiveThemeProvider>
  )
}
