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

export type DashboardNavSection = {
  readonly id: string
  readonly label: string
  readonly items: readonly DashboardNavItem[]
}

export const dashboardNavigationSections: readonly DashboardNavSection[] = [
  {
    id: "today",
    label: "Aujourd’hui",
    items: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { name: "Priorités", href: "/intelligence", icon: Sparkles },
      { name: "Demandes clients", href: "/leads", icon: Users },
      { name: "Agenda", href: "/appointments", icon: CalendarDays },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { name: "Suivi commercial", href: "/commercial", icon: BriefcaseBusiness },
      { name: "Clients", href: "/customers", icon: ContactRound },
      { name: "Facturation", href: "/billing", icon: Receipt },
      { name: "Dossiers", href: "/registration", icon: FolderOpen },
    ],
  },
  {
    id: "vehicles",
    label: "Véhicules",
    items: [
      { name: "Parc véhicules", href: "/stock", icon: Car },
      { name: "Recherche & achats", href: "/acquisition", icon: Search },
      { name: "Analyse du marché", href: "/market", icon: Globe },
    ],
  },
  {
    id: "pilotage",
    label: "Pilotage",
    items: [
      { name: "Pilotage", href: "/analytics", icon: BarChart3 },
      { name: "Copilote", href: "/copilot", icon: Bot },
      { name: "Paramètres", href: "/settings", icon: Settings },
    ],
  },
]

export const dashboardNavigation = dashboardNavigationSections.flatMap((section) => section.items)

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
