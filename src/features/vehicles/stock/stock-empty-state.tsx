import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getVehicleStatusLabel } from "../status/vehicle-status"
import type { StockQuery } from "./stock-query-schema"

function emptyMessage(query: StockQuery, hasAnyVehicle: boolean) {
  if (!hasAnyVehicle) return "Aucun véhicule dans le stock"
  if (query.q) return `Aucun résultat pour « ${query.q} »`
  if (query.status === "PUBLISHED") return "Aucun véhicule publié"
  if (query.status === "PREPARATION") return "Aucun véhicule en préparation"
  if (query.status === "RESERVED") return "Aucun véhicule réservé"
  if (query.status === "SOLD") return "Aucun véhicule vendu"
  if (query.status) return `Aucun véhicule avec le statut « ${getVehicleStatusLabel(query.status)} »`
  if (query.missingVin) return "Aucun véhicule sans VIN"
  return "Aucun véhicule ne correspond aux filtres sélectionnés"
}

export function StockEmptyState({ query, hasAnyVehicle }: { query: StockQuery; hasAnyVehicle: boolean }) {
  return (
    <div className="rounded-xl border border-dashed bg-white px-6 py-14 text-center">
      <h2 className="text-xl font-semibold">{emptyMessage(query, hasAnyVehicle)}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasAnyVehicle ? "Modifiez ou réinitialisez les filtres pour élargir la recherche." : "Importez une annonce ou ajoutez votre premier véhicule manuellement."}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        {hasAnyVehicle ? (
          <Button asChild><Link href="/stock">Réinitialiser les filtres</Link></Button>
        ) : (
          <>
            <Button asChild><Link href="/stock/import">Importer une annonce</Link></Button>
            <Button asChild variant="outline"><Link href="/stock/new">Ajouter manuellement</Link></Button>
          </>
        )}
      </div>
    </div>
  )
}
