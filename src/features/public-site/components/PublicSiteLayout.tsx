import type { ReactNode } from "react"
import Link from "next/link"
import { Mail, MapPin } from "lucide-react"

import { LiveThemeProvider } from "@/features/theme"
import { publicMapsDirectionsHref } from "../builders"
import type { GaragePublicViewModel } from "../types"
import { PublicCallButton } from "./PublicCallButton"
import { PublicSiteBrand } from "./PublicSiteBrand"
import { PublicSiteHeader } from "./PublicNavigation"
import { PublicSocialIcon } from "./PublicSocialIcon"

export function PublicSiteLayout({ garage, children }: { readonly garage: GaragePublicViewModel; readonly children: ReactNode }) {
  const mapHref = garage.address ? publicMapsDirectionsHref(garage.address) : null
  return (
    <LiveThemeProvider theme={garage.theme} className="flex min-h-screen flex-col bg-[var(--live-background)] text-[var(--live-foreground)]">
      <PublicSiteHeader garage={garage} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--live-border)] bg-[var(--live-surface)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-sm md:grid-cols-3 md:px-8">
          <div className="min-w-0 space-y-3">
            <PublicSiteBrand garage={garage} compact />
            <p className="text-[var(--live-muted-foreground)]">{garage.name}</p>
          </div>
          <div className="space-y-3">
            {garage.phoneHref ? (
              <PublicCallButton
                href={garage.phoneHref}
                className="inline-flex min-h-10 items-center gap-2 font-semibold hover:underline"
              />
            ) : null}
            {garage.email ? (
              <a className="flex items-center gap-2 hover:underline" href={`mailto:${garage.email}`}>
                <Mail className="size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                {garage.email}
              </a>
            ) : null}
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 font-medium hover:underline"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                <span>
                  <span className="block">{garage.address}</span>
                  <span>Obtenir mon itinéraire</span>
                </span>
              </a>
            ) : garage.address ? (
              <p className="flex items-start gap-2 text-[var(--live-muted-foreground)]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--live-primary)]" aria-hidden="true" />
                {garage.address}
              </p>
            ) : null}
            {garage.socialLinks.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {garage.socialLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--live-border-strong)] px-3 font-medium hover:bg-[var(--live-surface-muted)]"
                    >
                      <PublicSocialIcon label={link.label} />
                      {link.label}
                    </a>
                ))}
              </div>
            ) : null}
          </div>
          <nav aria-label="Informations légales" className="space-y-2 md:text-right">
            <Link className="block hover:underline" href={`${garage.homeHref}/mentions-legales`}>Mentions légales</Link>
            <Link className="block hover:underline" href={`${garage.homeHref}/politique-confidentialite`}>Confidentialité</Link>
          </nav>
        </div>
      </footer>
    </LiveThemeProvider>
  )
}
