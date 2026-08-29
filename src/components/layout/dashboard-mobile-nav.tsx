"use client"

import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import {
  dashboardNavigation,
  isDashboardNavItemActive,
  resolveDashboardSectionTitle,
} from "./dashboard-navigation"

export function DashboardSectionTitle() {
  const pathname = usePathname() ?? ""
  return resolveDashboardSectionTitle(pathname)
}

export function DashboardMobileNav() {
  const pathname = usePathname() ?? ""

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-11 md:hidden"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-zinc-950 p-0 text-white sm:max-w-72">
        <SheetHeader className="border-b border-zinc-800 px-4 py-4">
          <SheetTitle className="text-white">Navigation</SheetTitle>
        </SheetHeader>
        <nav aria-label="Navigation principale" className="space-y-1 overflow-y-auto p-3">
          {dashboardNavigation.map((item) => {
            const Icon = item.icon
            const active = isDashboardNavItemActive(pathname, item.href)
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white aria-[current=page]:bg-zinc-800 aria-[current=page]:font-medium aria-[current=page]:text-white"
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.name}
                </Link>
              </SheetClose>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
