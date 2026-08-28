import Link from "next/link"
import type { BillingListItemViewModel } from "../builders/billing-view-models"

type BillingDocumentListProps = {
  readonly title: string
  readonly description: string
  readonly createHref: string
  readonly createLabel: string
  readonly items: readonly BillingListItemViewModel[]
}

export function BillingDocumentList({
  title,
  description,
  createHref,
  createLabel,
  items,
}: BillingDocumentListProps) {
  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        <Link href={createHref} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          {createLabel}
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Aucun document pour le moment.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="grid gap-2 rounded-xl border bg-white p-4 transition hover:border-primary/40 sm:grid-cols-[1.2fr_1fr_auto_auto]"
            >
              <div>
                <p className="font-medium">{item.documentNumber}</p>
                <p className="text-sm text-muted-foreground">{item.customerLabel}</p>
              </div>
              <p className="text-sm">{item.dateLabel}</p>
              <span className="inline-flex min-h-8 items-center self-start rounded-full bg-muted px-3 text-xs font-medium">
                {item.statusLabel}
              </span>
              <div className="text-right">
                <p className="font-semibold">{item.amountLabel}</p>
                {item.outstandingLabel ? (
                  <p className="text-xs text-amber-700">Reste {item.outstandingLabel}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
