import {
    LayoutDashboard,
    Car,
    Globe,
    ShoppingCart,
    ChartNoAxesCombined,
    Bot,
    Bell,
    Settings,
  } from "lucide-react"
  
  const menu = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
    },
    {
      label: "Stock",
      icon: Car,
      href: "/stock",
    },
    {
      label: "Market Intelligence",
      icon: Globe,
      href: "/market",
    },
    {
      label: "Buying Assistant",
      icon: ShoppingCart,
      href: "/buying",
    },
    {
      label: "Analytics",
      icon: ChartNoAxesCombined,
      href: "/analytics",
    },
    {
      label: "AI Copilot",
      icon: Bot,
      href: "/ai",
    },
    {
      label: "Alertes",
      icon: Bell,
      href: "/alerts",
    },
    {
      label: "Paramètres",
      icon: Settings,
      href: "/settings",
    },
  ]
  
  export function Sidebar() {
    return (
      <aside className="hidden lg:flex h-screen w-72 flex-col border-r bg-background">
  
        <div className="flex h-16 items-center px-6 border-b">
          <div>
            <h1 className="text-xl font-bold">
              Garage OS
            </h1>
            <p className="text-xs text-muted-foreground">
              Automotive Intelligence
            </p>
          </div>
        </div>
  
  
        <nav className="flex-1 space-y-1 p-4">
  
          {menu.map((item) => {
  
            const Icon = item.icon
  
            return (
              <a
                key={item.href}
                href={item.href}
                className="
                flex items-center gap-3
                rounded-lg
                px-3 py-2
                text-sm
                hover:bg-muted
                transition
                "
              >
                <Icon size={18}/>
  
                {item.label}
  
              </a>
            )
  
          })}
  
        </nav>
  
  
        <div className="border-t p-4">
  
          <p className="text-xs text-muted-foreground">
            Garage OS v1.0
          </p>
  
        </div>
  
      </aside>
    )
  }