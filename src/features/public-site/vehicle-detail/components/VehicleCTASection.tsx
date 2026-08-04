import Link from "next/link"

import type { VehicleCTASectionViewModel } from "../presentation"

const actionClassName = "flex min-h-12 flex-1 items-center justify-center rounded-lg px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"

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
          <a href={cta.primary.href} className={`${actionClassName} bg-[var(--live-primary)] text-[var(--live-primary-foreground)]`}>
            {cta.primary.label}
          </a>
          {cta.secondary ? (
            <Link href={cta.secondary.href} className={`${actionClassName} border border-[var(--live-border)]`}>
              {cta.secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <aside aria-label="Actions véhicule" className="sticky top-6 hidden rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface)] p-6 lg:block">
      <h2 className="text-xl font-semibold">{cta.title}</h2>
      <p className="mt-2 text-sm text-[var(--live-muted-foreground)]">{cta.description}</p>
      <div className="mt-6 grid gap-3">
        <a href={cta.primary.href} className={`${actionClassName} bg-[var(--live-primary)] text-[var(--live-primary-foreground)]`}>
          {cta.primary.label}
        </a>
        {cta.secondary ? (
          <Link href={cta.secondary.href} className={`${actionClassName} border border-[var(--live-border)]`}>
            {cta.secondary.label}
          </Link>
        ) : null}
        {cta.placeholders.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled
            aria-disabled="true"
            title="Fonctionnalité non disponible dans cette version"
            className="min-h-11 rounded-lg border border-[var(--live-border)] px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
