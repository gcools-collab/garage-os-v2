import { Filter, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getVehicleStatusLabel,
  vehicleStatuses,
} from "../status/vehicle-status"
import {
  stockOperationalFilterKeys,
  stockOperationalFilterLabels,
  type StockQuery,
} from "./stock-query-schema"

const sortLabels: Record<StockQuery["sort"], string> = {
  recent: "Plus récents",
  oldest: "Plus anciens",
  "purchase-asc": "Prix d’achat croissant",
  "purchase-desc": "Prix d’achat décroissant",
  "selling-asc": "Prix de vente croissant",
  "selling-desc": "Prix de vente décroissant",
  "mileage-asc": "Kilométrage croissant",
  "mileage-desc": "Kilométrage décroissant",
  "margin-asc": "Marge potentielle croissante",
  "margin-desc": "Marge potentielle décroissante",
}

export function StockFilterBar({ query }: { query: StockQuery }) {
  return (
    <form action="/stock" method="get" className="rounded-xl border bg-white p-4 shadow-xs">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_240px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query.q}
            placeholder="Marque, modèle, VIN, immatriculation…"
            className="pl-9"
            aria-label="Rechercher un véhicule"
          />
        </div>
        <select
          name="status"
          defaultValue={query.status ?? ""}
          aria-label="Filtrer par statut"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Tous les statuts</option>
          {vehicleStatuses.map((status) => (
            <option key={status} value={status}>{getVehicleStatusLabel(status)}</option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={query.sort}
          aria-label="Trier le stock"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <Button type="submit"><Search aria-hidden="true" />Rechercher</Button>
      </div>

      <details className="group mt-3 rounded-lg border bg-muted/20">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium marker:content-none">
          <Filter className="size-4" aria-hidden="true" />Plus de filtres
          <span className="text-xs font-normal text-muted-foreground">Filtres opérationnels combinables</span>
        </summary>
        <div className="grid gap-3 border-t p-3 sm:grid-cols-2 lg:grid-cols-4">
          {stockOperationalFilterKeys.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={key}
                value="true"
                defaultChecked={query[key]}
                className="size-4 rounded border-input accent-primary"
              />
              {stockOperationalFilterLabels[key]}
            </label>
          ))}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="secondary" size="sm">Appliquer les filtres</Button>
          </div>
        </div>
      </details>
    </form>
  )
}
