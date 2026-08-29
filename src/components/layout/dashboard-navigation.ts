import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Car,
  ContactRound,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"

export type DashboardNavItem = {
  readonly name: string
  readonly href: string
  readonly icon: LucideIcon
}

export const dashboardNavigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Priorités du jour", href: "/intelligence", icon: Sparkles },
  { name: "Copilote", href: "/copilot", icon: Bot },
  { name: "Boîte commerciale", href: "/commercial", icon: BriefcaseBusiness },
  { name: "Stock", href: "/stock", icon: Car },
  { name: "Acquisition", href: "/acquisition", icon: Search },
  { name: "Demandes clients", href: "/leads", icon: Users },
  { name: "Clients", href: "/customers", icon: ContactRound },
  { name: "Agenda", href: "/appointments", icon: CalendarDays },
  { name: "Facturation", href: "/billing", icon: Receipt },
  { name: "Dossiers", href: "/registration", icon: FolderOpen },
  { name: "Analyse du marché", href: "/market", icon: Globe },
  { name: "Pilotage", href: "/analytics", icon: BarChart3 },
  { name: "Paramètres", href: "/settings", icon: Settings },
] as const satisfies readonly DashboardNavItem[]

export function isDashboardNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function resolveDashboardSectionTitle(pathname: string) {
  const match = dashboardNavigation
    .slice()
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => isDashboardNavItemActive(pathname, item.href))
  return match?.name ?? "Tableau de bord"
}
