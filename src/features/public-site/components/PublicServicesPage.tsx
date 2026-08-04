import { Car, FileText, Gauge, KeyRound, ShieldCheck, Wrench } from "lucide-react"
import Link from "next/link"

import type { PublicProgramPageViewModel, PublicServicesPageViewModel } from "../types"
import type { PublicServiceIcon } from "../services"
import { PublicSiteLayout } from "./PublicSiteLayout"

const icons = {
  CAR: Car,
  KEY: KeyRound,
  FILE: FileText,
  ENGINE: Gauge,
  TOOLS: Wrench,
  SHIELD: ShieldCheck,
} satisfies Readonly<Record<PublicServiceIcon, typeof Car>>

export function PublicServicesPage({ page }: { readonly page: PublicServicesPageViewModel }) {
  return (
    <PublicSiteLayout garage={page.garage}>
      <main className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">Services</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{page.title}</h1>
          <p className="mt-5 text-lg text-[var(--live-muted-foreground)]">{page.description}</p>
        </header>
        {page.services.length ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {page.services.map((service) => {
              const Icon = icons[service.icon]
              return (
                <article key={service.id} className="rounded-3xl border border-[var(--live-border)] bg-[var(--live-surface)] p-7">
                  <span className="grid size-12 place-items-center rounded-xl bg-[var(--live-primary)] text-[var(--live-primary-foreground)]"><Icon aria-hidden="true" /></span>
                  <h2 className="mt-6 text-2xl font-semibold">{service.title}</h2>
                  <p className="mt-3 text-[var(--live-muted-foreground)]">{service.description}</p>
                  <Link href={service.href} className="mt-7 inline-flex min-h-11 items-center rounded-xl border border-[var(--live-border-strong)] px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">{service.actionLabel}</Link>
                </article>
              )
            })}
          </div>
        ) : <p className="mt-12 rounded-2xl border p-6 text-[var(--live-muted-foreground)]">Aucun service complémentaire n’est actuellement proposé.</p>}
      </main>
    </PublicSiteLayout>
  )
}

export function PublicProgramPage({ page }: { readonly page: PublicProgramPageViewModel }) {
  return (
    <PublicSiteLayout garage={page.garage}>
      <main className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--live-primary)]">{page.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">{page.title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--live-muted-foreground)]">{page.description}</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">{page.benefits.map((benefit) => <li key={benefit} className="rounded-2xl border border-[var(--live-border)] p-5 font-medium">{benefit}</li>)}</ul>
        <Link href={page.action.href} className="mt-10 inline-flex min-h-12 items-center rounded-xl bg-[var(--live-primary)] px-6 font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">{page.action.label}</Link>
      </main>
    </PublicSiteLayout>
  )
}
