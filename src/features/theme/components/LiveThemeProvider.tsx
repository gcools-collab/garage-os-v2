import type { CSSProperties, ReactNode } from "react"

import { buildLiveThemeCssVariables } from "../engine"
import type { LiveThemeCssVariables, LiveThemeDefinition } from "../types"

export type LiveThemeStyle = CSSProperties & LiveThemeCssVariables

export function LiveThemeProvider({
  children,
  theme,
  className,
  layoutStyle,
}: {
  readonly children: ReactNode
  readonly theme: LiveThemeDefinition
  readonly className?: string
  readonly layoutStyle?: CSSProperties
}) {
  const style: LiveThemeStyle = {
    ...buildLiveThemeCssVariables(theme),
    ...layoutStyle,
  }

  return (
    <div data-live-theme={theme.key} data-live-mode={theme.mode} style={style} className={className}>
      {children}
    </div>
  )
}
