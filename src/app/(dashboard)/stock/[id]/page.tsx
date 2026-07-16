import { notFound } from "next/navigation"

import { VehicleImageGallery } from "@/features/vehicles/vehicle-image-gallery"
import { VehicleImageUpload } from "@/features/vehicles/vehicle-image-upload"
import { VehicleForm } from "@/features/vehicles/vehicle-form"
import { calculateVehicleMargin } from "@/features/vehicles/utils"
import { createClient } from "@/lib/supabase/server"

type VehiclePageProps = {
  params: Promise<{
    id: string
  }>
}

type VehicleCost = {
  id: string
  type: string
  label: string
  amount: number | string
  notes: string | null
  created_at: string
}

type VehicleEvent = {
  id: string
  type: string
  description: string | null
  created_at: string
}

type VehicleImage = {
  id: string
  storage_path: string
  url: string | null
  type: string
  is_primary: boolean
  created_at: string
}

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("fr-FR").format(Number(value ?? 0))
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value))
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select(`
      *,
      vehicle_events (*),
      vehicle_costs (*),
      vehicle_images (*)
    `)
    .eq("id", id)
    .single()

  if (error || !vehicle) {
    notFound()
  }

  const vehicleCosts = (vehicle.vehicle_costs ?? []) as VehicleCost[]
  const vehicleEvents = (vehicle.vehicle_events ?? []) as VehicleEvent[]
  const vehicleImages = (vehicle.vehicle_images ?? []) as VehicleImage[]

  const sortedImages = [...vehicleImages].sort((first, second) => {
    if (first.is_primary === second.is_primary) {
      return (
        new Date(first.created_at).getTime() -
        new Date(second.created_at).getTime()
      )
    }

    return first.is_primary ? -1 : 1
  })

  const sortedEvents = [...vehicleEvents].sort(
    (first, second) =>
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime()
  )

  const profitability = calculateVehicleMargin({
    ...vehicle,
    vehicle_costs: vehicleCosts,
  })

  const marketPrice = Number(vehicle.market_price ?? 0)

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Fiche véhicule
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            {vehicle.brand} {vehicle.model}
          </h1>

          <p className="mt-2 text-muted-foreground">
            {vehicle.version ? `${vehicle.version} · ` : ""}
            {vehicle.year ?? "Année inconnue"} ·{" "}
            {formatNumber(vehicle.mileage)} km
          </p>
        </div>

        <div className="w-fit rounded-full border bg-white px-4 py-2 text-sm font-medium">
          {vehicle.status}
        </div>
      </section>

      <section className="space-y-5 rounded-xl border bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold">Modifier le véhicule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complète la fiche métier utilisée par les futurs moteurs Garage OS.
          </p>
        </div>

        <VehicleForm mode="edit" vehicle={vehicle} />
      </section>

      <section className="space-y-5 rounded-xl border bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold">Photos du véhicule</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Ajoute les photos extérieures et intérieures destinées à la fiche
            et aux futures annonces.
          </p>
        </div>

        <VehicleImageUpload vehicleId={vehicle.id} />

        <VehicleImageGallery
          images={sortedImages}
          vehicleName={`${vehicle.brand} ${vehicle.model}`}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold">
            Informations véhicule
          </h2>

          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Marque</dt>
              <dd className="font-medium">{vehicle.brand}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Modèle</dt>
              <dd className="font-medium">{vehicle.model}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Version</dt>
              <dd className="font-medium">{vehicle.version ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Finition</dt>
              <dd className="font-medium">{vehicle.trim ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Année</dt>
              <dd className="font-medium">{vehicle.year ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Kilométrage</dt>
              <dd className="font-medium">
                {formatNumber(vehicle.mileage)} km
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Couleur</dt>
              <dd className="font-medium">{vehicle.color ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Mise en circulation</dt>
              <dd className="font-medium">
                {formatDate(vehicle.first_registration_date)}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold">Identification</h2>

          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">VIN</dt>
              <dd className="font-mono font-medium">{vehicle.vin ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Immatriculation</dt>
              <dd className="font-medium">
                {vehicle.registration_number ?? "-"}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Propriétaires</dt>
              <dd className="font-medium">{vehicle.owners_count ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Portes</dt>
              <dd className="font-medium">{vehicle.doors ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Places</dt>
              <dd className="font-medium">{vehicle.seats ?? "-"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold">Technique</h2>

          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Motorisation</dt>
              <dd className="font-medium">{vehicle.engine ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Carburant</dt>
              <dd className="font-medium">{vehicle.fuel ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Boîte</dt>
              <dd className="font-medium">{vehicle.gearbox ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Transmission</dt>
              <dd className="font-medium">{vehicle.transmission ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Puissance DIN</dt>
              <dd className="font-medium">
                {vehicle.power_din == null ? "-" : `${vehicle.power_din} ch`}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Puissance fiscale</dt>
              <dd className="font-medium">
                {vehicle.fiscal_power == null
                  ? "-"
                  : `${vehicle.fiscal_power} CV`}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Émissions CO₂</dt>
              <dd className="font-medium">
                {vehicle.co2_emissions == null
                  ? "-"
                  : `${vehicle.co2_emissions} g/km`}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Crit’Air</dt>
              <dd className="font-medium">{vehicle.crit_air ?? "-"}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Norme Euro</dt>
              <dd className="font-medium">{vehicle.euro_standard ?? "-"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold">Rentabilité</h2>

          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Prix d’achat</dt>
              <dd className="font-medium">
                {formatCurrency(vehicle.purchase_price)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Frais enregistrés</dt>
              <dd className="font-medium">
                {formatCurrency(profitability.costs)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Capital investi</dt>
              <dd className="font-medium">
                {formatCurrency(profitability.investment)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Valeur marché</dt>
              <dd className="font-medium">
                {formatCurrency(marketPrice)}
              </dd>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium">Marge estimée</dt>
                <dd
                  className={
                    profitability.margin >= 0
                      ? "text-xl font-bold text-emerald-600"
                      : "text-xl font-bold text-red-600"
                  }
                >
                  {formatCurrency(profitability.margin)}
                </dd>
              </div>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border bg-white p-6">
          <h2 className="mb-5 text-lg font-semibold">Suivi</h2>

          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Statut</dt>
              <dd className="font-medium">{vehicle.status}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Date d’achat</dt>
              <dd className="font-medium">
                {formatDate(vehicle.purchase_date)}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Date de vente</dt>
              <dd className="font-medium">{formatDate(vehicle.sale_date)}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Créé le</dt>
              <dd className="font-medium">{formatDate(vehicle.created_at)}</dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Mis à jour le</dt>
              <dd className="font-medium">{formatDate(vehicle.updated_at)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-xl border bg-white p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Détail des coûts</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Tous les frais engagés sur ce véhicule.
              </p>
            </div>

            <span className="text-sm font-semibold">
              {formatCurrency(profitability.costs)}
            </span>
          </div>

          {vehicleCosts.length > 0 ? (
            <div className="divide-y">
              {vehicleCosts.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{cost.label}</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {cost.type}
                      {cost.notes ? ` · ${cost.notes}` : ""}
                    </p>
                  </div>

                  <p className="shrink-0 font-semibold">
                    {formatCurrency(cost.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-zinc-50 p-8 text-center text-sm text-muted-foreground">
              Aucun coût enregistré.
            </div>
          )}
        </article>

        <article className="rounded-xl border bg-white p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Timeline</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Historique complet de la vie du véhicule.
            </p>
          </div>

          {sortedEvents.length > 0 ? (
            <div className="space-y-6">
              {sortedEvents.map((event) => (
                <div key={event.id} className="relative pl-7">
                  <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-zinc-950" />
                  <span className="absolute bottom-[-24px] left-[5px] top-4 w-px bg-zinc-200 last:hidden" />

                  <p className="font-medium">{event.type}</p>

                  {event.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}

                  <time className="mt-2 block text-xs text-muted-foreground">
                    {formatDate(event.created_at)}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-zinc-50 p-8 text-center text-sm text-muted-foreground">
              Aucun événement enregistré.
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
