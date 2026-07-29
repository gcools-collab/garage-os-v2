import type { LiveThemeDefinition } from "../types"
import { LiveThemeProvider } from "./LiveThemeProvider"

export function LiveThemePreview({ theme }: { readonly theme: LiveThemeDefinition }) {
  return (
    <LiveThemeProvider
      theme={theme}
      className="overflow-hidden rounded-lg border border-[var(--live-border)] bg-[var(--live-background)] p-3 text-[var(--live-foreground)]"
    >
      <div className="rounded-md border border-[var(--live-border)] bg-[var(--live-surface-elevated)] p-3 shadow-sm shadow-[var(--live-shadow-color)]">
        <p className="text-sm font-semibold">Véhicule premium</p>
        <p className="mt-1 text-xs text-[var(--live-muted-foreground)]">Disponible immédiatement</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-semibold text-[var(--live-accent)]">42 000 €</span>
          <span className="rounded px-2 py-1 text-xs font-semibold bg-[var(--live-primary)] text-[var(--live-primary-foreground)]">
            Découvrir
          </span>
        </div>
      </div>
    </LiveThemeProvider>
  )
}
