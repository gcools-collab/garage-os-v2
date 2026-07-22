import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { stockQueryToSearchParams, type StockQuery } from "./stock-query-schema"

function pageHref(query: StockQuery, page: number) {
  const params = stockQueryToSearchParams({ ...query, page })
  return `/stock?${params}`
}

export function StockPagination({ query, page, pageCount }: { query: StockQuery; page: number; pageCount: number }) {
  if (pageCount <= 1) return null
  return (
    <nav aria-label="Pagination du stock" className="flex items-center justify-between gap-4 pt-2">
      <Button asChild={page > 1} variant="outline" disabled={page <= 1}>
        {page > 1 ? <Link href={pageHref(query, page - 1)}><ChevronLeft />Précédent</Link> : <span><ChevronLeft />Précédent</span>}
      </Button>
      <span className="text-sm text-muted-foreground">Page {page} sur {pageCount}</span>
      <Button asChild={page < pageCount} variant="outline" disabled={page >= pageCount}>
        {page < pageCount ? <Link href={pageHref(query, page + 1)}>Suivant<ChevronRight /></Link> : <span>Suivant<ChevronRight /></span>}
      </Button>
    </nav>
  )
}
