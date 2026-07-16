import Link from "next/link"
import { Car, Eye, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge, type VehicleStatus } from "./status-badge"
import { VehicleDeleteButton } from "./vehicle-delete-button"
import { calculateVehicleProfitability } from "./utils"

export type StockVehicle = {
  id: string
  brand: string
  model: string
  trim: string | null
  year: number | null
  mileage: number | null
  status: VehicleStatus
  purchase_price: number | string | null
  selling_price: number | string | null
  vehicle_costs: Array<{ amount: number | string | null }> | null
  vehicle_images: Array<{
    url: string | null
    is_primary: boolean
    created_at: string
  }> | null
}

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

export function StockVehicleList({ vehicles }: { vehicles: StockVehicle[] }) {
  return (
    <div className="space-y-3">
      {vehicles.map((vehicle) => {
        const image = primaryImage(vehicle)
        const name = [vehicle.brand, vehicle.model, vehicle.trim]
          .filter(Boolean)
          .join(" ")
        const profitability = calculateVehicleProfitability(vehicle)

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

              <dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Prix d&apos;achat</dt>
                  <dd className="mt-1 font-medium">
                    {currency.format(Number(vehicle.purchase_price ?? 0))}
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
