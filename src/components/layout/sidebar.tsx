"use client"

import {
  BarChart3,
  BriefcaseBusiness,
  Bot,
  Car,
  Globe,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { GarageBrandingShellViewModel } from "@/features/branding"

export const dashboardNavigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Priorités du jour", href: "/intelligence", icon: Sparkles },
  { name: "Copilote", href: "/copilot", icon: Bot },
  { name: "Boîte commerciale", href: "/commercial", icon: BriefcaseBusiness },
  { name: "Stock", href: "/stock", icon: Car },
  { name: "Acquisition", href: "/acquisition", icon: Search },
  { name: "Demandes clients", href: "/leads", icon: Users },
  { name: "Analyse du marché", href: "/market", icon: Globe },
  { name: "Pilotage", href: "/analytics", icon: BarChart3 },
  { name: "Paramètres", href: "/settings", icon: Settings },
] as const

export function Sidebar({ branding }: { readonly branding: GarageBrandingShellViewModel }) {
  const pathname = usePathname()

  return (
    <aside className="hidden min-h-screen w-72 flex-col bg-zinc-950 p-6 text-white md:flex">
      <div className="mb-10 flex min-w-0 items-center gap-3">
        <Avatar size="lg" className="bg-zinc-800">
          {branding.logoUrl ? <AvatarImage src={branding.logoUrl} alt="" /> : null}
          <AvatarFallback className="bg-zinc-800 font-semibold text-white">{branding.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold" title={branding.displayName}>{branding.displayName}</p>
          <p className="truncate text-xs text-zinc-400">{branding.subtitle}</p>
        </div>
      </div>

      <nav className="space-y-2" aria-label="Navigation principale">
        {dashboardNavigation.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white aria-[current=page]:bg-zinc-800 aria-[current=page]:font-medium aria-[current=page]:text-white"
            >
              <Icon size={18} aria-hidden="true" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
