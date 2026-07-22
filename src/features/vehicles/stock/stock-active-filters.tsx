import Link from "next/link"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getVehicleStatusLabel } from "../status/vehicle-status"
import {
  stockOperationalFilterKeys,
  stockOperationalFilterLabels,
  stockQueryToSearchParams,
  type StockQuery,
} from "./stock-query-schema"

function without(query: StockQuery, key: keyof StockQuery) {
  const next = { ...query, page: 1 }
  if (key === "q") next.q = ""
  else if (key === "status") next.status = undefined
  else if (key === "sort") next.sort = "recent"
  else if (key !== "page") next[key] = false as never
  const params = stockQueryToSearchParams(next)
  return params.size ? `/stock?${params}` : "/stock"
}

export function StockActiveFilters({ query }: { query: StockQuery }) {
  const filters = [
    ...(query.q ? [{ key: "q" as const, label: `Recherche : « ${query.q} »` }] : []),
    ...(query.status
      ? [{ key: "status" as const, label: getVehicleStatusLabel(query.status) }]
      : []),
    ...stockOperationalFilterKeys.flatMap((key) =>
      query[key] ? [{ key, label: stockOperationalFilterLabels[key] }] : []
    ),
  ]
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Filtres actifs</span>
      {filters.map((filter) => (
        <Badge key={filter.key} variant="secondary" asChild>
          <Link href={without(query, filter.key)}>
            {filter.label}<X aria-hidden="true" />
          </Link>
        </Badge>
      ))}
      <Button asChild variant="ghost" size="sm"><Link href="/stock">Tout effacer</Link></Button>
    </div>
  )
}
