import Link from "next/link"
import { Plus, Upload } from "lucide-react"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { StockVehicleList } from "@/features/vehicles/stock-vehicle-list"
import { StockActiveFilters } from "@/features/vehicles/stock/stock-active-filters"
import { StockEmptyState } from "@/features/vehicles/stock/stock-empty-state"
import { StockFilterBar } from "@/features/vehicles/stock/stock-filter-bar"
import { StockPagination } from "@/features/vehicles/stock/stock-pagination"
import {
  parseStockQuery,
  type RawStockSearchParams,
} from "@/features/vehicles/stock/stock-query-schema"
import { StockService } from "@/features/vehicles/stock/stock-service"
import { StockSummaryTabs } from "@/features/vehicles/stock/stock-summary-tabs"
import { createClient } from "@/lib/supabase/server"

type StockPageProps = {
  searchParams: Promise<RawStockSearchParams>
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const query = parseStockQuery(await searchParams)
  const supabase = await createClient()
  const data = await new StockService(supabase).getStock(query)
  if (!data) redirect("/register")

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock véhicules</h1>
          <p className="mt-2 text-muted-foreground">
            Retrouvez, filtrez et pilotez les véhicules de vos garages.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/stock/import"><Upload aria-hidden="true" />Importer une annonce</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/stock/new"><Plus aria-hidden="true" />Ajouter manuellement</Link>
          </Button>
        </div>
      </header>

      <StockSummaryTabs query={query} counts={data.counts} />
      <StockFilterBar query={query} />
      <StockActiveFilters query={query} />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Véhicules</h2>
          <span className="text-sm text-muted-foreground">
            {data.totalFiltered} résultat{data.totalFiltered !== 1 ? "s" : ""}
          </span>
        </div>

        {data.vehicles.length > 0 ? (
          <>
            <StockVehicleList vehicles={data.vehicles} />
            <StockPagination query={query} page={data.page} pageCount={data.pageCount} />
          </>
        ) : (
          <StockEmptyState query={query} hasAnyVehicle={data.counts.all > 0} />
        )}
      </section>
    </div>
  )
}
