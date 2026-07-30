import type { ReactNode } from "react"

export function VehicleSection({
  id,
  title,
  description,
  children,
}: {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface)] p-6 sm:p-8">
      <div className="mb-6">
        <h2 id={id} className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-2 text-[var(--live-muted-foreground)]">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
