import { CalendarDays, Phone } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { LiveThemeProvider } from "@/features/theme"
import type { GaragePublicViewModel } from "../types"
import { PublicNavigation } from "./PublicNavigation"

export function PublicSiteLayout({ garage, children }: { readonly garage: GaragePublicViewModel; readonly children: ReactNode }) {
  const phoneHref = garage.phone ? `tel:${garage.phone.replace(/\s/g, "")}` : null
  return (
    <LiveThemeProvider theme={garage.theme} className="flex min-h-screen flex-col bg-[var(--live-background)] text-[var(--live-foreground)]">
      <header className="border-b border-[var(--live-border)] bg-[var(--live-background)]">
        <div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
          <Link href={garage.homeHref} aria-label={`Accueil ${garage.name}`} className="shrink-0 font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)]">
            {garage.name}
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <PublicNavigation navigation={garage.navigation}/>
            <div className="flex shrink-0 items-center gap-2 border-l border-[var(--live-border)] pl-2 sm:pl-3">
              {phoneHref ? (
                <a href={phoneHref} aria-label={`Appeler ${garage.name} au ${garage.phone}`} className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  <span className="hidden lg:inline">{garage.phone}</span>
                </a>
              ) : null}
              <Link href={`${garage.homeHref}/contact`} className="flex min-h-10 items-center gap-2 rounded-lg bg-[var(--live-primary)] px-3 text-sm font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]">
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Rendez-vous</span>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--live-border)] bg-[var(--live-surface)]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 text-sm md:grid-cols-3 md:px-8">
          <div><p className="font-semibold">{garage.name}</p><p className="mt-2 text-[var(--live-muted-foreground)]">{garage.address}</p></div>
          <div className="space-y-2">{garage.phone ? <a className="block hover:underline" href={`tel:${garage.phone}`}>{garage.phone}</a> : null}{garage.email ? <a className="block hover:underline" href={`mailto:${garage.email}`}>{garage.email}</a> : null}</div>
          <nav aria-label="Informations légales" className="space-y-2 md:text-right">
            <Link className="block hover:underline" href={`${garage.homeHref}/mentions-legales`}>Mentions légales</Link>
            <Link className="block hover:underline" href={`${garage.homeHref}/politique-confidentialite`}>Confidentialité</Link>
          </nav>
        </div>
      </footer>
    </LiveThemeProvider>
  )
}
