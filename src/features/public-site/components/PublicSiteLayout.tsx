import type { ReactNode } from "react"
import Link from "next/link"

import { LiveThemeProvider } from "@/features/theme"
import type { GaragePublicViewModel } from "../types"
import { PublicNavigation } from "./PublicNavigation"
import { PublicSiteBrand } from "./PublicSiteBrand"

function CallGarageLink({
  href,
  className,
}: {
  readonly href: string
  readonly className: string
}) {
  return <a href={href} className={className}>Appeler le garage</a>
}

export function PublicSiteLayout({ garage, children }: { readonly garage: GaragePublicViewModel; readonly children: ReactNode }) {
  return (
    <LiveThemeProvider theme={garage.theme} className="flex min-h-screen flex-col bg-[var(--live-background)] text-[var(--live-foreground)]">
      <header className="border-b border-[var(--live-border)] bg-[var(--live-background)]">
        <div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3 md:px-8">
          <PublicSiteBrand garage={garage} />
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {garage.phoneHref ? (
              <CallGarageLink
                href={garage.phoneHref}
                className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-[var(--live-border-strong)] px-3 text-sm font-semibold hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
              />
            ) : null}
            <Link
              href={`${garage.homeHref}/contact?project=test-drive`}
              className="inline-flex min-h-10 shrink-0 items-center rounded-xl bg-[var(--live-primary)] px-3 text-sm font-semibold text-[var(--live-primary-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
            >
              Rendez-vous
            </Link>
            <PublicNavigation navigation={garage.navigation}/>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--live-border)] bg-[var(--live-surface)]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 text-sm md:grid-cols-3 md:px-8">
          <div><p className="font-semibold">{garage.name}</p><p className="mt-2 text-[var(--live-muted-foreground)]">{garage.address}</p></div>
          <div className="space-y-2">{garage.phoneHref ? <CallGarageLink href={garage.phoneHref} className="block font-medium hover:underline" /> : null}{garage.email ? <a className="block hover:underline" href={`mailto:${garage.email}`}>{garage.email}</a> : null}</div>
          <nav aria-label="Informations légales" className="space-y-2 md:text-right">
            <Link className="block hover:underline" href={`${garage.homeHref}/mentions-legales`}>Mentions légales</Link>
            <Link className="block hover:underline" href={`${garage.homeHref}/politique-confidentialite`}>Confidentialité</Link>
          </nav>
        </div>
      </footer>
    </LiveThemeProvider>
  )
}
