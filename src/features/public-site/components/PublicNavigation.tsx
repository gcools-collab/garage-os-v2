"use client"

import { useEffect, useId, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Phone, X } from "lucide-react"
import type { GaragePublicViewModel, PublicNavigationItemViewModel } from "../types"
import { PublicCallButton } from "./PublicCallButton"
import { PublicSiteBrand } from "./PublicSiteBrand"

function isActivePath(pathname: string, href: string) {
  const path = href.split("?")[0] ?? href
  return pathname === path || pathname.startsWith(`${path}/`)
}

function DesktopLinks({
  navigation,
  pathname,
}: {
  readonly navigation: readonly PublicNavigationItemViewModel[]
  readonly pathname: string
}) {
  return (
    <nav aria-label="Navigation principale" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
      {navigation.map((item) => {
        const active = isActivePath(pathname, item.href)
        if (item.children?.length) {
          return (
            <details key={item.href} className="group relative">
              <summary
                aria-current={active ? "page" : undefined}
                className="cursor-pointer list-none rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[var(--live-surface-muted)] aria-[current=page]:bg-[var(--live-surface-muted)] aria-[current=page]:font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
              >
                {item.label}
              </summary>
              <div className="absolute left-1/2 z-30 mt-2 min-w-56 -translate-x-1/2 rounded-xl border border-[var(--live-border)] bg-[var(--live-surface-elevated)] p-2 shadow-[0_12px_36px_var(--live-shadow-color)]">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    aria-current={pathname === child.href.split("?")[0] && child.href.includes("category") ? undefined : pathname === child.href.split("?")[0] ? "page" : undefined}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </details>
          )
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-[var(--live-surface-muted)] aria-[current=page]:bg-[var(--live-surface-muted)] aria-[current=page]:font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function PublicSiteHeader({ garage }: { readonly garage: GaragePublicViewModel }) {
  const pathname = usePathname() ?? ""
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const callClassName = "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--live-border-strong)] px-3 text-sm font-semibold hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <header className="border-b border-[var(--live-border)] bg-[var(--live-background)]">
      <div className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center gap-3 px-4 py-2 sm:min-h-20 sm:px-5 md:px-8">
        <PublicSiteBrand garage={garage} placement="header" />
        <DesktopLinks navigation={garage.navigation} pathname={pathname} />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {garage.phoneHref ? (
            <>
              <a
                href={garage.phoneHref}
                aria-label="Nous appeler"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--live-border-strong)] sm:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
              >
                <Phone className="size-4" aria-hidden="true" strokeWidth={1.75} />
              </a>
              <PublicCallButton href={garage.phoneHref} className={`${callClassName} hidden sm:inline-flex`} />
            </>
          ) : null}
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--live-border-strong)] lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-x-0 top-0 z-50 max-h-dvh overflow-y-auto border-b border-[var(--live-border)] bg-[var(--live-background)] px-4 pb-6 pt-3 shadow-[0_16px_40px_var(--live-shadow-color)]"
          >
            <div className="flex items-center justify-between gap-3">
              <PublicSiteBrand garage={garage} placement="menu" />
              <button
                type="button"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--live-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
                aria-label="Fermer le menu"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Navigation principale" className="mt-5 grid gap-1">
              {garage.navigation.flatMap((item) => {
                const links = item.children?.length ? item.children : [item]
                return links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-3 text-base font-medium hover:bg-[var(--live-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-focus-ring)]"
                  >
                    {link.label}
                  </Link>
                ))
              })}
            </nav>
            {garage.phoneHref ? (
              <PublicCallButton
                href={garage.phoneHref}
                className={`${callClassName} mt-5 w-full justify-center bg-[var(--live-primary)] text-[var(--live-primary-foreground)]`}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  )
}

export function PublicNavigation({ navigation }: { readonly navigation: GaragePublicViewModel["navigation"] }) {
  const pathname = usePathname() ?? ""
  return <DesktopLinks navigation={navigation} pathname={pathname} />
}
