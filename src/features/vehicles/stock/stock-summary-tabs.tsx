import Link from "next/link"

import { cn } from "@/lib/utils"
import { getVehicleStatusLabel, type VehicleStatus } from "../status/vehicle-status"
import { stockQueryToSearchParams, type StockQuery } from "./stock-query-schema"
import type { StockStatusCounts } from "./stock-types"

const tabs: Array<{ status?: VehicleStatus; label: string; count: keyof StockStatusCounts }> = [
  { label: "Tous", count: "all" },
  { status: "PREPARATION", label: getVehicleStatusLabel("PREPARATION"), count: "PREPARATION" },
  { status: "PUBLISHED", label: "Publiés", count: "PUBLISHED" },
  { status: "RESERVED", label: "Réservés", count: "RESERVED" },
  { status: "SOLD", label: "Vendus", count: "SOLD" },
]

export function StockSummaryTabs({ query, counts }: { query: StockQuery; counts: StockStatusCounts }) {
  return (
    <nav aria-label="Vues rapides du stock" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {tabs.map((tab) => {
        const next = { ...query, status: tab.status, page: 1 }
        const params = stockQueryToSearchParams(next)
        const active = query.status === tab.status
        return (
          <Link
            key={tab.label}
            href={params.size ? `/stock?${params}` : "/stock"}
            className={cn(
              "rounded-xl border bg-white p-3 shadow-xs transition-colors hover:bg-muted/40",
              active && "border-primary bg-primary/[0.04] ring-1 ring-primary/20"
            )}
          >
            <span className="block text-xs text-muted-foreground">{tab.label}</span>
            <span className="mt-1 block text-xl font-semibold tabular-nums">{counts[tab.count]}</span>
          </Link>
        )
      })}
    </nav>
  )
}
