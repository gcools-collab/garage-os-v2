import { Car, Fuel, Gauge, Settings2 } from "lucide-react"

import { StatusBadge, type VehicleStatus } from "../status-badge"
import type { VehicleProfitability } from "../utils"

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const number = new Intl.NumberFormat("fr-FR")

type VehicleHeroProps = {
  brand: string
  model: string
  version: string | null
  trim: string | null
  year: number | null
  mileage: number | null
  fuel: string | null
  gearbox: string | null
  status: VehicleStatus
  primaryImageUrl: string | null
  completeness: number
  purchasePrice: number
  sellingPrice: number | null
  profitability: VehicleProfitability
}

export function VehicleHero(props: VehicleHeroProps) {
  const subtitle = [props.version, props.trim]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" · ")
  const details = [
    { icon: Gauge, value: props.year?.toString() ?? "Année inconnue" },
    {
      icon: Car,
      value: props.mileage == null ? "Kilométrage inconnu" : `${number.format(props.mileage)} km`,
    },
    { icon: Fuel, value: props.fuel ?? "Carburant non renseigné" },
    { icon: Settings2, value: props.gearbox ?? "Boîte non renseignée" },
  ]

  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="grid lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
        <div className="relative min-h-64 bg-muted lg:min-h-[390px]">
          {props.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.primaryImageUrl}
              alt={`${props.brand} ${props.model}`}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Car className="size-16 opacity-30" aria-hidden="true" />
              <span className="text-sm font-medium">Aucune photo principale</span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-8 p-5 sm:p-7 lg:p-9">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Centre de commande
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  {props.brand} {props.model}
                </h1>
                {subtitle && <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>}
              </div>
              <StatusBadge status={props.status} />
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {details.map(({ icon: Icon, value }) => (
                <span key={value} className="flex items-center gap-2">
                  <Icon className="size-4" aria-hidden="true" />
                  {value}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Complétude</span>
                <span className="font-semibold tabular-nums">{props.completeness} %</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Complétude du véhicule"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={props.completeness}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${props.completeness}%` }} />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <EconomicValue label="Prix d’achat" value={currency.format(props.purchasePrice)} />
              <EconomicValue
                label="Prix de vente"
                value={props.sellingPrice == null ? "Non renseigné" : currency.format(props.sellingPrice)}
              />
              <EconomicValue
                label="Marge potentielle"
                value={
                  props.profitability.potentialMargin == null
                    ? "Non renseignée"
                    : currency.format(props.profitability.potentialMargin)
                }
                emphasized
              />
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

function EconomicValue({
  label,
  value,
  emphasized = false,
}: {
  label: string
  value: string
  emphasized?: boolean
}) {
  return (
    <div className={`rounded-xl border p-3 ${emphasized ? "col-span-2 bg-primary/[0.03] sm:col-span-1" : ""}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
