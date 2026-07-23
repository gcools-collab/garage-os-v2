import type { ReactNode } from "react"

export function LiveBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--live-border)] bg-[var(--live-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--live-muted-foreground)]">
      {children}
    </span>
  )
}
