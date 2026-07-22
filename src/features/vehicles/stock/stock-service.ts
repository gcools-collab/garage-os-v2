import type { createClient } from "@/lib/supabase/server"
import {
  getCompletenessChecks,
  getCompletenessPercentage,
} from "@/features/acquisition/completeness"
import type { DraftVehicle } from "@/features/acquisition/types"
import { calculateVehicleProfitability } from "../utils"
import type { StockQuery } from "./stock-query-schema"
import type {
  StockPageData,
  StockStatusCounts,
  StockVehicle,
} from "./stock-types"

type StockSupabaseClient = Awaited<ReturnType<typeof createClient>>
type StockVehicleRow = Omit<StockVehicle, "completeness">

const PAGE_SIZE = 20

function toCompletenessDraft(vehicle: StockVehicleRow): DraftVehicle {
  return {
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
    advertisedPrice:
      vehicle.selling_price == null ? null : Number(vehicle.selling_price),
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

function completeness(vehicle: StockVehicleRow) {
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

function numericComparison(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc"
) {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return direction === "asc" ? left - right : right - left
}

function sortVehicles(vehicles: StockVehicle[], sort: StockQuery["sort"]) {
  return [...vehicles].sort((left, right) => {
    if (sort === "recent") return right.created_at.localeCompare(left.created_at)
    if (sort === "oldest") return left.created_at.localeCompare(right.created_at)
    if (sort === "purchase-asc" || sort === "purchase-desc") {
      return numericComparison(
        left.purchase_price == null ? null : Number(left.purchase_price),
        right.purchase_price == null ? null : Number(right.purchase_price),
        sort.endsWith("asc") ? "asc" : "desc"
      )
    }
    if (sort === "selling-asc" || sort === "selling-desc") {
      return numericComparison(
        left.selling_price == null ? null : Number(left.selling_price),
        right.selling_price == null ? null : Number(right.selling_price),
        sort.endsWith("asc") ? "asc" : "desc"
      )
    }
    if (sort === "mileage-asc" || sort === "mileage-desc") {
      return numericComparison(
        left.mileage,
        right.mileage,
        sort.endsWith("asc") ? "asc" : "desc"
      )
    }
    const leftMargin = calculateVehicleProfitability(left).potentialMargin
    const rightMargin = calculateVehicleProfitability(right).potentialMargin
    return numericComparison(
      leftMargin,
      rightMargin,
      sort === "margin-asc" ? "asc" : "desc"
    )
  })
}

function applyRelationalFilters(vehicles: StockVehicle[], query: StockQuery) {
  return vehicles.filter((vehicle) => {
    const links = vehicle.marketplace_links ?? []
    if (query.missingPhoto && (vehicle.vehicle_images?.length ?? 0) > 0) return false
    if (query.missingCost && (vehicle.vehicle_costs?.length ?? 0) > 0) return false
    if (query.marketplaceImported && links.length === 0) return false
    if (query.online && !links.some((link) => link.status === "ACTIVE")) return false
    return true
  })
}

export class StockService {
  constructor(private readonly supabase: StockSupabaseClient) {}

  async getStock(query: StockQuery): Promise<StockPageData | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    if (!user) return null

    const { data: memberships, error: membershipError } = await this.supabase
      .from("garage_members")
      .select("garage_id")
      .eq("user_id", user.id)
    if (membershipError) {
      console.error("Unable to read stock garage memberships", {
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

    let vehicleQuery = this.supabase
      .from("vehicles")
      .select(`
        id, brand, model, version, trim, year, mileage, status,
        purchase_price, selling_price, vin, registration_number,
        fuel, gearbox, color, description, power_din, fiscal_power,
        doors, seats, first_registration_date, body_type, upholstery,
        crit_air, created_at,
        vehicle_costs (amount),
        vehicle_images (url, is_primary, created_at),
        marketplace_links (provider, status, published_at)
      `)
      .in("garage_id", garageIds)

    if (query.status) vehicleQuery = vehicleQuery.eq("status", query.status)
    if (query.missingPurchasePrice) {
      vehicleQuery = vehicleQuery.or("purchase_price.is.null,purchase_price.lte.0")
    }
    if (query.missingSellingPrice) vehicleQuery = vehicleQuery.is("selling_price", null)
    if (query.missingVin) vehicleQuery = vehicleQuery.or("vin.is.null,vin.eq.")
    if (query.missingRegistration) {
      vehicleQuery = vehicleQuery.or("registration_number.is.null,registration_number.eq.")
    }
    if (query.q) {
      const search = query.q
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
      if (search) {
        vehicleQuery = vehicleQuery.or(
          ["brand", "model", "trim", "version", "vin", "registration_number"]
            .map((column) => `${column}.ilike.%${search}%`)
            .join(",")
        )
      }
    }

    const countForStatus = (status?: string) => {
      let countQuery = this.supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .in("garage_id", garageIds)
      if (status) countQuery = countQuery.eq("status", status)
      return countQuery
    }

    const [vehicleResult, allCount, preparationCount, publishedCount, reservedCount, soldCount] =
      await Promise.all([
        vehicleQuery,
        countForStatus(),
        countForStatus("PREPARATION"),
        countForStatus("PUBLISHED"),
        countForStatus("RESERVED"),
        countForStatus("SOLD"),
      ])

    if (vehicleResult.error) {
      console.error("Unable to read filtered vehicle stock", {
        garageIds,
        code: vehicleResult.error.code,
        message: vehicleResult.error.message,
      })
      throw new Error("Impossible de charger le stock véhicules.")
    }
    const countResults = [allCount, preparationCount, publishedCount, reservedCount, soldCount]
    const countError = countResults.find((result) => result.error)?.error
    if (countError) {
      console.error("Unable to read stock status counts", {
        garageIds,
        code: countError.code,
        message: countError.message,
      })
      throw new Error("Impossible de charger les compteurs du stock.")
    }

    const vehiclesWithCompleteness = ((vehicleResult.data ?? []) as unknown as StockVehicleRow[])
      .map((vehicle) => ({ ...vehicle, completeness: completeness(vehicle) }))
    const filtered = applyRelationalFilters(vehiclesWithCompleteness, query)
    const sorted = sortVehicles(filtered, query.sort)
    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
    const page = Math.min(query.page, pageCount)
    const start = (page - 1) * PAGE_SIZE
    const counts: StockStatusCounts = {
      all: allCount.count ?? 0,
      PREPARATION: preparationCount.count ?? 0,
      PUBLISHED: publishedCount.count ?? 0,
      RESERVED: reservedCount.count ?? 0,
      SOLD: soldCount.count ?? 0,
    }

    return {
      vehicles: sorted.slice(start, start + PAGE_SIZE),
      totalFiltered: sorted.length,
      page,
      pageCount,
      pageSize: PAGE_SIZE,
      counts,
    }
  }
}
