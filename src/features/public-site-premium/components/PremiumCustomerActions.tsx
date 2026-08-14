import Link from "next/link"
import type { ReactNode } from "react"
import type { PremiumHomepageViewModel } from "../presentation"

function ActionPanel({ id, label, actions, children }: { readonly id: string; readonly label: string; readonly actions: PremiumHomepageViewModel["appointmentActions"]; readonly children?: ReactNode }) {
  return <details id={id} className="group relative flex-1 md:flex-none"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-xl px-4 text-sm font-semibold hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">{label}</summary><div className="absolute bottom-full right-0 mb-3 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface-elevated)] p-5 shadow-[0_12px_36px_var(--live-shadow-color)]"><p className="font-semibold">{label}</p>{children}<nav aria-label={label} className="mt-4 grid gap-2">{actions.map(action=><Link key={action.href} href={action.href} className="rounded-xl border border-[var(--live-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]">{action.label}</Link>)}</nav></div></details>
}

export function PremiumCustomerActions({ homepage }: { readonly homepage: PremiumHomepageViewModel }) {
  return <nav aria-label="Actions rapides" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex gap-2 rounded-2xl border border-[var(--live-border)] bg-[var(--live-surface-elevated)]/95 p-2 shadow-[0_12px_36px_var(--live-shadow-color)] backdrop-blur md:left-auto md:right-5 md:w-auto">
    {homepage.appointmentActions.length ? <ActionPanel id="customer-appointment" label="Prendre rendez-vous" actions={homepage.appointmentActions}><p className="mt-2 text-sm text-[var(--live-muted-foreground)]">Choisissez un parcours disponible pour ce garage.</p></ActionPanel> : null}
    <ActionPanel id="customer-contact" label="Nous contacter" actions={homepage.contactActions}><div className="mt-2 space-y-1 text-sm text-[var(--live-muted-foreground)]">{homepage.contact.phone?<p>{homepage.contact.phone.label}</p>:null}{homepage.contact.email?<p>{homepage.contact.email.label}</p>:null}{homepage.contact.address?<p>{homepage.contact.address}</p>:null}</div></ActionPanel>
  </nav>
}
