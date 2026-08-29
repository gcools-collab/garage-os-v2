import { CalendarDays, MessageCircle, type LucideIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import type { PremiumHomepageViewModel } from "../presentation"

function ActionPanel({
  id,
  label,
  icon: Icon,
  actions,
  children,
}: {
  readonly id: string
  readonly label: string
  readonly icon: LucideIcon
  readonly actions: PremiumHomepageViewModel["appointmentActions"]
  readonly children?: ReactNode
}) {
  return <details id={id} className="group relative flex-1 md:flex-none">
    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)] [&::-webkit-details-marker]:hidden">
      <Icon className="size-4 shrink-0 opacity-80" aria-hidden="true" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </summary>
    <div className="absolute bottom-full right-0 mb-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface-elevated)] p-4 shadow-[0_12px_36px_var(--live-shadow-color)]">
      <p className="flex items-center gap-2 font-semibold"><Icon className="size-4 shrink-0 opacity-80" aria-hidden="true" strokeWidth={1.75} />{label}</p>
      {children}
      <nav aria-label={label} className="mt-3 grid gap-2">{actions.map((action) => <Link key={action.href} href={action.href} className="rounded-xl border border-[var(--live-border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]">{action.label}</Link>)}</nav>
    </div>
  </details>
}

export function PremiumCustomerActions({ homepage }: { readonly homepage: PremiumHomepageViewModel }) {
  return <nav aria-label="Actions rapides" className="pointer-events-none fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-end md:inset-x-auto md:right-5 md:bottom-5">
    <div className="pointer-events-auto flex w-full max-w-md gap-1.5 rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface-elevated)]/95 p-1.5 shadow-[0_8px_28px_var(--live-shadow-color)] backdrop-blur md:w-auto md:max-w-none">
      <ActionPanel
        id="customer-appointment"
        label="Prendre rendez-vous"
        icon={CalendarDays}
        actions={homepage.appointmentActions.length ? homepage.appointmentActions : [{ label: "Prendre rendez-vous", href: `${homepage.garage.homeHref}/contact` }]}
      >
        <p className="mt-2 text-sm text-[var(--live-muted-foreground)]">Choisissez un parcours disponible pour ce garage.</p>
      </ActionPanel>
      <ActionPanel id="customer-contact" label="Nous contacter" icon={MessageCircle} actions={homepage.contactActions}>
        <div className="mt-2 space-y-1 text-sm text-[var(--live-muted-foreground)]">
          {homepage.contact.phone ? <a className="block hover:underline" href={homepage.contact.phone.href}>{homepage.contact.phone.label}</a> : null}
          {homepage.contact.email ? <a className="block hover:underline" href={homepage.contact.email.href}>{homepage.contact.email.label}</a> : null}
          {homepage.contact.address ? <p>{homepage.contact.address}</p> : null}
        </div>
      </ActionPanel>
    </div>
  </nav>
}
