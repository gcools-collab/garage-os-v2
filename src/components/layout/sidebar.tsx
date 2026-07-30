import {
  BarChart3,
  Bell,
  Car,
  Globe,
  BriefcaseBusiness,
  Sparkles,
  Bot,
  LayoutDashboard,
  Users,
  Megaphone,
  Settings,
  ShoppingCart,
  Search,
} from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { GarageBrandingShellViewModel } from "@/features/branding"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Intelligence", href: "/intelligence", icon: Sparkles },
  { name: "Copilote", href: "/copilot", icon: Bot },
  { name: "Boîte commerciale", href: "/commercial", icon: BriefcaseBusiness },
  { name: "Stock", href: "/stock", icon: Car },
  { name: "Acquisition", href: "/acquisition", icon: Search },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Market Intelligence", href: "/market", icon: Globe },
  { name: "Buying Assistant", href: "/buying", icon: ShoppingCart },
  { name: "Diffusion", href: "/diffusion", icon: Megaphone },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Alertes", href: "/alerts", icon: Bell },
  { name: "Paramètres", href: "/settings", icon: Settings },
] as const

export function Sidebar({ branding }: { readonly branding: GarageBrandingShellViewModel }) {
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

      <nav className="space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white">
              <Icon size={18} aria-hidden="true" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
