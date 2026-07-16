import type { createClient } from "@/lib/supabase/server"
import {
  getCompletenessChecks,
  getCompletenessPercentage,
} from "@/features/acquisition/completeness"
import type { DraftVehicle } from "@/features/acquisition/types"
import type {
  DashboardData,
  DashboardPriority,
  DashboardRecentVehicle,
} from "../types/dashboard"
import { calculateVehicleProfitability } from "@/features/vehicles/utils"
import type { VehicleStatus } from "@/features/vehicles/status/vehicle-status"

type DashboardSupabaseClient = Awaited<ReturnType<typeof createClient>>

type VehicleImageRow = {
  url: string | null
  is_primary: boolean
  created_at: string
}

type DashboardVehicleRow = {
  id: string
  brand: string
  model: string
  trim: string | null
  year: number | null
  mileage: number | null
  fuel: string | null
  gearbox: string | null
  color: string | null
  power_din: number | null
  fiscal_power: number | null
  doors: number | null
  seats: number | null
  first_registration_date: string | null
  body_type: string | null
  upholstery: string | null
  crit_air: number | null
  description: string | null
  notes: string | null
  vin: string | null
  registration_number: string | null
  purchase_price: number | string | null
  selling_price: number | string | null
  created_at: string
  updated_at: string
  sale_date: string | null
  status: VehicleStatus
  vehicle_images: VehicleImageRow[] | null
  vehicle_costs: Array<{ amount: number | string | null }> | null
}

function startOfCurrentWeek(now: Date) {
  const start = new Date(now)
  const day = start.getDay()
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
  start.setHours(0, 0, 0, 0)
  return start
}

function toCompletenessDraft(vehicle: DashboardVehicleRow): DraftVehicle {
  return {
    provider: "dashboard",
    sourceUrl: "https://garage-os.local/stock",
    externalId: vehicle.id,
    publishedAt: null,
    originalTitle: `${vehicle.brand} ${vehicle.model}`,
    brand: vehicle.brand,
    model: vehicle.model,
    trim: vehicle.trim,
    year: vehicle.year,
    mileage: vehicle.mileage,
    advertisedPrice: Number(vehicle.selling_price ?? 0) || null,
    description: vehicle.description,
    photos: (vehicle.vehicle_images ?? []).flatMap((image) =>
      image.url ? [image.url] : []
    ),
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
}

function vehicleCompleteness(vehicle: DashboardVehicleRow) {
  const checks = getCompletenessChecks(
    toCompletenessDraft(vehicle),
    Number(vehicle.purchase_price ?? 0) > 0
  ).map((check) => {
    if (check.label === "VIN") {
      return { ...check, complete: Boolean(vehicle.vin?.trim()) }
    }
    if (check.label === "Immatriculation") {
      return { ...check, complete: Boolean(vehicle.registration_number?.trim()) }
    }
    return check
  })
  return getCompletenessPercentage(checks)
}

function primaryImage(vehicle: DashboardVehicleRow) {
  const images = vehicle.vehicle_images ?? []
  return (
    images.find((image) => image.is_primary)?.url ??
    [...images].sort((left, right) =>
      left.created_at.localeCompare(right.created_at)
    )[0]?.url ??
    null
  )
}

export class DashboardService {
  constructor(private readonly supabase: DashboardSupabaseClient) {}

  async getDashboard(now = new Date()): Promise<DashboardData | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) return null

    const { data: memberships, error: membershipError } = await this.supabase
      .from("garage_members")
      .select("garage_id")
      .eq("user_id", user.id)
    if (membershipError) {
      console.error("Unable to read dashboard garage memberships", {
        code: membershipError.code,
        message: membershipError.message,
      })
      throw new Error("Impossible de déterminer les garages accessibles.")
    }

    const garageIds = [
      ...new Set(
        (memberships ?? []).flatMap((membership) =>
          membership.garage_id ? [membership.garage_id] : []
        )
      ),
    ]
    if (garageIds.length === 0) {
      throw new Error("Aucun garage n'est associé à cet utilisateur.")
    }

    const weekStart = startOfCurrentWeek(now)
    const [garageResult, vehicleResult, importResult] = await Promise.all([
        this.supabase
          .from("garages")
          .select("name")
          .in("id", garageIds)
          .order("created_at", { ascending: true }),
        this.supabase
          .from("vehicles")
          .select(`
            id, brand, model, trim, year, mileage, fuel, gearbox, color,
            power_din, fiscal_power, doors, seats, first_registration_date,
            body_type, upholstery, crit_air, description, notes, vin,
            registration_number, purchase_price, selling_price, status,
            sale_date, created_at, updated_at,
            vehicle_images (url, is_primary, created_at),
            vehicle_costs (amount)
          `)
          .in("garage_id", garageIds)
          .order("created_at", { ascending: false }),
        this.supabase
          .from("marketplace_links")
          .select("imported_at, vehicles!inner(garage_id)")
          .in("vehicles.garage_id", garageIds)
          .gte("imported_at", weekStart.toISOString()),
      ])

    for (const [query, error] of [
      ["garages", garageResult.error],
      ["vehicles", vehicleResult.error],
      ["marketplace_links", importResult.error],
    ] as const) {
      if (error) {
        console.error(`Unable to read dashboard ${query}`, {
          garageIds,
          code: error.code,
          message: error.message,
        })
        throw new Error(`Impossible de charger les données Dashboard (${query}).`)
      }
    }

    const garages = garageResult.data ?? []
    if (garages.length !== garageIds.length) {
      console.error("Garage memberships and readable garages are inconsistent", {
        membershipGarageIds: garageIds,
        readableGarageIdsCount: garages.length,
      })
      throw new Error("Les memberships et les garages accessibles sont incohérents.")
    }
    const vehicles = (vehicleResult.data ?? []) as DashboardVehicleRow[]
    const imports = (importResult.data ?? []) as Array<{ imported_at: string }>
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const recentSaleStart = new Date(now)
    recentSaleStart.setDate(recentSaleStart.getDate() - 30)

    const displayedValue = vehicles.reduce(
      (total, vehicle) => total + Number(vehicle.selling_price ?? 0),
      0
    )
    const purchaseCost = vehicles.reduce(
      (total, vehicle) => total + Number(vehicle.purchase_price ?? 0),
      0
    )
    const potentialMargin = vehicles.reduce((total, vehicle) => {
      const profitability = calculateVehicleProfitability(vehicle)
      return total + (profitability.potentialMargin ?? 0)
    }, 0)

    const priorities: DashboardPriority[] = [
      {
        id: "purchasePrice",
        count: vehicles.filter((vehicle) => Number(vehicle.purchase_price ?? 0) <= 0)
          .length,
        label: "sans prix d'achat",
        href: "/stock",
      },
      {
        id: "vin",
        count: vehicles.filter((vehicle) => !vehicle.vin?.trim()).length,
        label: "sans VIN",
        href: "/stock",
      },
      {
        id: "registration",
        count: vehicles.filter((vehicle) => !vehicle.registration_number?.trim()).length,
        label: "sans immatriculation",
        href: "/stock",
      },
      {
        id: "photo",
        count: vehicles.filter((vehicle) => (vehicle.vehicle_images?.length ?? 0) === 0)
          .length,
        label: "sans photo",
        href: "/stock",
      },
      {
        id: "notes",
        count: vehicles.filter((vehicle) => !vehicle.notes?.trim()).length,
        label: "sans note interne",
        href: "/stock",
      },
    ]

    const recentVehicles: DashboardRecentVehicle[] = vehicles
      .slice(0, 5)
      .map((vehicle) => ({
        id: vehicle.id,
        name: [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" "),
        createdAt: vehicle.created_at,
        primaryImageUrl: primaryImage(vehicle),
      }))

    const completeness = vehicles.map(vehicleCompleteness)

    return {
      garageName:
        garages.length === 1
          ? garages[0].name
          : `${garages.length} garages accessibles`,
      summary: {
        vehicleCount: vehicles.length,
        displayedValue,
        purchaseCost,
        potentialMargin,
      },
      priorities,
      recentVehicles,
      imports: {
        today: imports.filter(
          (item) => new Date(item.imported_at).getTime() >= todayStart.getTime()
        ).length,
        thisWeek: imports.length,
      },
      lifecycle: {
        preparation: vehicles.filter((vehicle) => vehicle.status === "PREPARATION").length,
        published: vehicles.filter((vehicle) => vehicle.status === "PUBLISHED").length,
        reserved: vehicles.filter((vehicle) => vehicle.status === "RESERVED").length,
        soldRecently: vehicles.filter(
          (vehicle) =>
            vehicle.status === "SOLD" &&
            new Date(vehicle.sale_date ?? vehicle.updated_at).getTime() >=
              recentSaleStart.getTime()
        ).length,
      },
      averageCompleteness:
        completeness.length > 0
          ? Math.round(
              completeness.reduce((total, score) => total + score, 0) /
                completeness.length
            )
          : 0,
    }
  }
}
