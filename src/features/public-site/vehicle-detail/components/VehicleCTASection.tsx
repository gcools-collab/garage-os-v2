import Link from "next/link"
import type { VehicleCTASectionViewModel } from "../presentation"

export function VehicleCTASection({
  cta,
  mobile = false,
}: {
  readonly cta: VehicleCTASectionViewModel
  readonly mobile?: boolean
}) {
  if (mobile) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--live-border)] bg-[var(--live-background)] p-3 lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <a href={cta.primary.href} className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-[var(--live-primary)] px-4 font-medium text-[var(--live-primary-foreground)] focus-visible:outline-2">{cta.primary.label}</a>
          {cta.secondary ? <Link href={cta.secondary.href} className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-[var(--live-border)] px-4 font-medium focus-visible:outline-2">{cta.secondary.label}</Link> : null}
        </div>
      </div>
    )
  }
  return (
    <aside aria-label="Actions véhicule" className="sticky top-6 hidden rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface)] p-6 lg:block">
      <h2 className="text-xl font-semibold">{cta.title}</h2>
      <p className="mt-2 text-sm text-[var(--live-muted-foreground)]">{cta.description}</p>
      <div className="mt-6 grid gap-3">
        <a href={cta.primary.href} className="flex min-h-12 items-center justify-center rounded-lg bg-[var(--live-primary)] px-4 font-medium text-[var(--live-primary-foreground)]">{cta.primary.label}</a>
        {cta.secondary ? <Link href={cta.secondary.href} className="flex min-h-12 items-center justify-center rounded-lg border border-[var(--live-border)] px-4 font-medium">{cta.secondary.label}</Link> : null}
        {cta.placeholders.map((item) => <button key={item.id} disabled className="min-h-11 rounded-lg border border-[var(--live-border)] px-4 text-sm disabled:opacity-50">{item.label}</button>)}
      </div>
    </aside>
  )
}
