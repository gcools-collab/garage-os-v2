import { CalendarDays, ChevronDown, Clock3, Plus } from "lucide-react"
import { notFound } from "next/navigation"

import {
  getCompletenessChecks,
  getCompletenessPercentage,
} from "@/features/acquisition/completeness"
import type { DraftVehicle } from "@/features/acquisition/types"
import { VehicleActionBar } from "@/features/vehicles/components/vehicle-action-bar"
import { VehicleAnalysisCard } from "@/features/vehicles/components/vehicle-analysis-card"
import { VehicleCostForm } from "@/features/vehicles/components/vehicle-cost-form"
import { VehicleCostList } from "@/features/vehicles/components/vehicle-cost-list"
import { VehicleHero } from "@/features/vehicles/components/vehicle-hero"
import { VehicleProfitabilityCard } from "@/features/vehicles/components/vehicle-profitability"
import {
  VehicleTimeline,
  type VehicleTimelineEvent,
} from "@/features/vehicles/components/vehicle-timeline"
import type { VehicleCostCategory } from "@/features/vehicles/cost-schema"
import type { VehicleImageCategory } from "@/features/vehicles/image-category"
import type { VehicleStatus } from "@/features/vehicles/status-badge"
import { calculateVehicleProfitability } from "@/features/vehicles/utils"
import { VehicleForm } from "@/features/vehicles/vehicle-form"
import { VehicleImageGallery } from "@/features/vehicles/vehicle-image-gallery"
import { VehicleImageUpload } from "@/features/vehicles/vehicle-image-upload"
import { createClient } from "@/lib/supabase/server"

type VehiclePageProps = {
  params: Promise<{ id: string }>
}

type VehicleCost = {
  id: string
  type: VehicleCostCategory
  label: string
  amount: number | string
  notes: string | null
  incurred_at: string
  created_at: string
}

type VehicleImage = {
  id: string
  storage_path: string
  url: string | null
  type: VehicleImageCategory
  is_primary: boolean
  created_at: string
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Non renseignée"
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
  if (!user) notFound()

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
  if (error || !vehicle) notFound()

  const vehicleCosts = (vehicle.vehicle_costs ?? []) as VehicleCost[]
  const vehicleEvents = (vehicle.vehicle_events ?? []) as VehicleTimelineEvent[]
  const vehicleImages = (vehicle.vehicle_images ?? []) as VehicleImage[]
  const sortedImages = [...vehicleImages].sort((first, second) => {
    if (first.is_primary === second.is_primary) {
      return first.created_at.localeCompare(second.created_at)
    }
    return first.is_primary ? -1 : 1
  })
  const sortedEvents = [...vehicleEvents].sort((first, second) =>
    second.created_at.localeCompare(first.created_at)
  )
  const profitability = calculateVehicleProfitability({
    ...vehicle,
    vehicle_costs: vehicleCosts,
  })
  const sellingPrice =
    vehicle.selling_price == null ? null : Number(vehicle.selling_price)
  const primaryImageUrl =
    sortedImages.find((image) => image.is_primary)?.url ??
    sortedImages.find((image) => image.url)?.url ??
    null

  const completenessDraft: DraftVehicle = {
    provider: "stock",
    sourceUrl: "https://garage-os.local/stock",
    externalId: vehicle.id,
    publishedAt: null,
    originalTitle: `${vehicle.brand} ${vehicle.model}`,
    brand: vehicle.brand,
    model: vehicle.model,
    trim: vehicle.trim,
    year: vehicle.year,
    mileage: vehicle.mileage,
    advertisedPrice: sellingPrice,
    description: vehicle.description,
    photos: vehicleImages.flatMap((image) => (image.url ? [image.url] : [])),
    location: null,
    favoriteCount: null,
    characteristics: {
      fuel: vehicle.fuel,
      gearbox: vehicle.gearbox,
      powerDin: vehicle.power_din,
      fiscalPower: vehicle.fiscal_power,
      color: vehicle.color,
      doors: vehicle.doors,
      seats: vehicle.seats,
      firstRegistrationDate: vehicle.first_registration_date,
      bodyType: vehicle.body_type,
      upholstery: vehicle.upholstery,
      critAir: vehicle.crit_air,
    },
  }
  const completenessChecks = getCompletenessChecks(
    completenessDraft,
    Number(vehicle.purchase_price ?? 0) > 0
  ).map((check) => {
    if (check.label === "VIN") return { ...check, complete: Boolean(vehicle.vin?.trim()) }
    if (check.label === "Immatriculation") {
      return { ...check, complete: Boolean(vehicle.registration_number?.trim()) }
    }
    return check
  })
  const completeness = getCompletenessPercentage(completenessChecks)

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <VehicleHero
        brand={vehicle.brand}
        model={vehicle.model}
        version={vehicle.version}
        trim={vehicle.trim}
        year={vehicle.year}
        mileage={vehicle.mileage}
        fuel={vehicle.fuel}
        gearbox={vehicle.gearbox}
        status={vehicle.status as VehicleStatus}
        primaryImageUrl={primaryImageUrl}
        completeness={completeness}
        purchasePrice={Number(vehicle.purchase_price ?? 0)}
        sellingPrice={sellingPrice}
        profitability={profitability}
      />

      <VehicleActionBar />

      <section id="vehicle-information" className="scroll-mt-6 space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Informations véhicule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les informations sont directement modifiables. Un seul enregistrement met à jour toute la fiche.
          </p>
        </div>
        <VehicleForm mode="edit" vehicle={vehicle} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <VehicleProfitabilityCard
          purchasePrice={Number(vehicle.purchase_price ?? 0)}
          sellingPrice={sellingPrice}
          profitability={profitability}
        />
        <VehicleAnalysisCard
          hasPhotos={vehicleImages.length > 0}
          hasVin={Boolean(vehicle.vin?.trim())}
          hasRegistration={Boolean(vehicle.registration_number?.trim())}
          hasSellingPrice={sellingPrice !== null}
          hasCosts={vehicleCosts.length > 0}
        />
      </section>

      <section id="vehicle-photos" className="scroll-mt-6 rounded-xl border bg-white p-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Galerie photos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {vehicleImages.length} photo{vehicleImages.length > 1 ? "s" : ""} · définissez la vue principale ou supprimez une image.
            </p>
          </div>
          <VehicleImageUpload vehicleId={vehicle.id} />
        </div>
        <VehicleImageGallery
          images={sortedImages}
          vehicleName={`${vehicle.brand} ${vehicle.model}`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article id="vehicle-costs" className="scroll-mt-6 rounded-xl border bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Historique des coûts</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tous les frais engagés sur ce véhicule.</p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(profitability.totalCosts)}
            </span>
          </div>
          <details className="group mb-5 rounded-lg border bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 marker:content-none">
              <span className="flex items-center gap-2 text-sm font-medium"><Plus className="size-4" />Ajouter un coût</span>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t p-4"><VehicleCostForm vehicleId={vehicle.id} /></div>
          </details>
          <VehicleCostList vehicleId={vehicle.id} costs={vehicleCosts} />
        </article>

        <article className="rounded-xl border bg-white p-5">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Timeline</h2>
            <p className="mt-1 text-sm text-muted-foreground">Historique de la vie du véhicule.</p>
          </div>
          <VehicleTimeline events={sortedEvents} />
        </article>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Suivi du véhicule</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <TrackingItem icon={CalendarDays} label="Date d’achat" value={formatDate(vehicle.purchase_date)} />
          <TrackingItem icon={CalendarDays} label="Date de vente" value={formatDate(vehicle.sale_date)} />
          <TrackingItem icon={Clock3} label="Créé le" value={formatDate(vehicle.created_at)} />
          <TrackingItem icon={Clock3} label="Mis à jour le" value={formatDate(vehicle.updated_at)} />
        </dl>
      </section>
    </div>
  )
}

function TrackingItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</dt>
      <dd className="mt-1.5 font-medium">{value}</dd>
    </div>
  )
}
