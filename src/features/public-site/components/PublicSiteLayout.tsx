import Link from "next/link"
import type { ReactNode } from "react"

import { LiveThemeProvider } from "@/features/theme"
import type { GaragePublicViewModel } from "../types"
import { PublicNavigation } from "./PublicNavigation"

export function PublicSiteLayout({ garage, children }: { readonly garage: GaragePublicViewModel; readonly children: ReactNode }) {
  return (
    <LiveThemeProvider theme={garage.theme} className="flex min-h-screen flex-col bg-[var(--live-background)] text-[var(--live-foreground)]">
      <header className="border-b border-[var(--live-border)] bg-[var(--live-background)]">
        <div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3 md:px-8">
          <Link href={garage.homeHref} aria-label={`Accueil ${garage.name}`} className="font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)]">
            {garage.name}
          </Link>
          <PublicNavigation navigation={garage.navigation}/>
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
