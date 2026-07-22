import Link from "next/link"
import { Car, Eye, Globe2, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "./status-badge"
import { VehicleDeleteButton } from "./vehicle-delete-button"
import { calculateVehicleProfitability } from "./utils"
import type { StockVehicle } from "./stock/stock-types"
import { marketplaceLinkStatusLabels } from "./marketplace-status"

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})
const number = new Intl.NumberFormat("fr-FR")

function primaryImage(vehicle: StockVehicle) {
  const images = vehicle.vehicle_images ?? []
  return (
    images.find((image) => image.is_primary)?.url ??
    [...images].sort((left, right) =>
      left.created_at.localeCompare(right.created_at)
    )[0]?.url ??
    null
  )
}

function onlineSummary(vehicle: StockVehicle) {
  const links = vehicle.marketplace_links ?? []
  const activeLink =
    links.find((link) => link.status === "ACTIVE") ?? links[0]
  if (!activeLink) return null
  const provider =
    activeLink.provider.toLocaleLowerCase("fr-FR") === "leboncoin"
      ? "Leboncoin"
      : activeLink.provider
  const status = marketplaceLinkStatusLabels[activeLink.status]
  if (!activeLink.published_at) return `${provider} · ${status}`
  const days = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(activeLink.published_at).getTime()) / 86_400_000
    )
  )
  return `${provider} · ${status} · ${days} jour${days > 1 ? "s" : ""}`
}

export function StockVehicleList({ vehicles }: { vehicles: StockVehicle[] }) {
  return (
    <div className="space-y-3">
      {vehicles.map((vehicle) => {
        const image = primaryImage(vehicle)
        const name = [vehicle.brand, vehicle.model, vehicle.trim]
          .filter(Boolean)
          .join(" ")
        const profitability = calculateVehicleProfitability(vehicle)
        const marketplace = onlineSummary(vehicle)

        return (
          <article
            key={vehicle.id}
            className="grid overflow-hidden rounded-xl border bg-white shadow-xs md:grid-cols-[160px_minmax(0,1fr)_auto]"
          >
            {image ? (
              <div
                role="img"
                aria-label={name}
                className="aspect-[16/9] bg-muted bg-cover bg-center md:aspect-auto md:min-h-36"
                style={{ backgroundImage: `url(${JSON.stringify(image)})` }}
              />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center bg-muted md:aspect-auto md:min-h-36">
                <Car className="size-10 text-muted-foreground/50" aria-hidden="true" />
              </div>
            )}

            <div className="min-w-0 space-y-4 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vehicle.year ?? "Année inconnue"} · {number.format(vehicle.mileage ?? 0)} km
                  </p>
                </div>
                <StatusBadge status={vehicle.status} />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {marketplace && (
                  <span className="flex items-center gap-1.5">
                    <Globe2 className="size-3.5" aria-hidden="true" />
                    {marketplace}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  Complétude
                  <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${vehicle.completeness}%` }} />
                  </span>
                  <strong className="font-medium text-foreground">{vehicle.completeness} %</strong>
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Prix d&apos;achat</dt>
                  <dd className="mt-1 font-medium">
                    {vehicle.purchase_price == null || Number(vehicle.purchase_price) <= 0
                      ? "Non renseigné"
                      : currency.format(Number(vehicle.purchase_price))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Valeur affichée</dt>
                  <dd className="mt-1 font-medium">
                    {vehicle.selling_price == null
                      ? "Non renseigné"
                      : currency.format(Number(vehicle.selling_price))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Capital investi</dt>
                  <dd className="mt-1 font-medium">
                    {currency.format(profitability.capitalInvested)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Marge potentielle</dt>
                  <dd className="mt-1 font-medium">
                    {profitability.potentialMargin == null
                      ? "Non renseignée"
                      : currency.format(profitability.potentialMargin)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-wrap items-center gap-1 border-t p-3 md:w-36 md:flex-col md:items-stretch md:justify-center md:border-l md:border-t-0">
              <Button asChild variant="ghost" size="sm" className="justify-start">
                <Link href={`/stock/${vehicle.id}`}>
                  <Eye className="size-4" aria-hidden="true" />
                  Voir la fiche
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="justify-start">
                <Link href={`/stock/${vehicle.id}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Modifier
                </Link>
              </Button>
              <VehicleDeleteButton vehicleId={vehicle.id} vehicleName={name} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
