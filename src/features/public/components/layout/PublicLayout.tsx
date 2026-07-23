import type { ReactNode } from "react"
import { getPublicThemeStyle } from "../../lib/theme-style"
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
  return (
    <div
      style={getPublicThemeStyle(theme)}
      className="flex min-h-screen flex-col bg-[var(--live-background)] font-[family-name:var(--live-font-family)] font-[var(--live-body-weight)] text-[var(--live-foreground)]"
    >
      <Header garage={garage} navigation={navigation} />
      <main className="flex-1">{children}</main>
      <Footer garage={garage} />
    </div>
  )
}
