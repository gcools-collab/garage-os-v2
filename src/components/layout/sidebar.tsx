"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import type { GarageBrandingShellViewModel } from "@/features/branding"

import { dashboardNavigationSections, isDashboardNavItemActive } from "./dashboard-navigation"

export { dashboardNavigation } from "./dashboard-navigation"

export function Sidebar({ branding }: { readonly branding: GarageBrandingShellViewModel }) {
  const pathname = usePathname() ?? ""

  return (
    <aside className="hidden min-h-screen w-72 flex-col bg-zinc-950 p-5 text-white md:flex">
      <div className="mb-8 flex min-w-0 items-center gap-3">
        {branding.logoUrl ? (
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
            <Image src={branding.logoUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
          </span>
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-zinc-800 text-sm font-semibold">
            {branding.initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-bold" title={branding.displayName}>{branding.displayName}</p>
        </div>
      </div>

      <nav aria-label="Navigation principale" className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {dashboardNavigationSections.map((section) => (
          <div key={section.id}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{section.label}</p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isDashboardNavItemActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white aria-[current=page]:bg-zinc-800 aria-[current=page]:font-medium aria-[current=page]:text-white"
                  >
                    <Icon size={18} aria-hidden="true" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
