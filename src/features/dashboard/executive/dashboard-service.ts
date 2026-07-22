import type { createClient } from "@/lib/supabase/server"
import type { VehicleStatus } from "@/features/vehicles/status/vehicle-status"
import { calculateVehicleProfitability } from "@/features/vehicles/utils"
import { calculateExecutiveFinancialMetrics } from "./financial-metrics"
import { calculateExecutivePriority } from "./executive-priority-engine"
import type {
  ExecutiveDashboardData,
  ExecutivePriority,
  WatchedVehicle,
} from "./types"

type ExecutiveSupabaseClient = Awaited<ReturnType<typeof createClient>>

type ExecutiveVehicleRow = {
  id: string
  brand: string
  model: string
  trim: string | null
  status: VehicleStatus
  purchase_price: number | string | null
  selling_price: number | string | null
  vin: string | null
  registration_number: string | null
  created_at: string
  vehicle_costs: Array<{ amount: number | string | null }> | null
  vehicle_images: Array<{ url: string | null; is_primary: boolean; created_at: string }> | null
  marketplace_links: Array<{ status: string; published_at: string | null }> | null
  vehicle_market_analyses: Array<{
    analyzed_at: string
    positioning: "BELOW_MARKET" | "IN_MARKET" | "ABOVE_MARKET" | null
  }> | null
}

const ACTIVE_STOCK_STATUSES: ReadonlySet<VehicleStatus> = new Set([
  "PURCHASED",
  "PREPARATION",
  "READY_TO_PUBLISH",
  "PUBLISHED",
  "RESERVED",
])

const DAY_MS = 86_400_000
const daysSince = (value: string, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / DAY_MS))

function primaryImage(vehicle: ExecutiveVehicleRow) {
  const images = vehicle.vehicle_images ?? []
  return images.find((image) => image.is_primary)?.url ??
    [...images].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]?.url ?? null
}

function publishedAge(vehicle: ExecutiveVehicleRow, now: Date) {
  const dates = (vehicle.marketplace_links ?? [])
    .filter((link) => link.status === "ACTIVE" && link.published_at)
    .map((link) => new Date(link.published_at!).getTime())
    .filter(Number.isFinite)
  return dates.length > 0 ? Math.floor((now.getTime() - Math.min(...dates)) / DAY_MS) : null
}

function toWatchedVehicle(vehicle: ExecutiveVehicleRow, now: Date): WatchedVehicle {
  const profitability = calculateVehicleProfitability(vehicle)
  const latestAnalysis = vehicle.vehicle_market_analyses?.[0] ?? null
  const base = {
    ageDays: daysSince(vehicle.created_at, now),
    status: vehicle.status,
    hasPhotos: (vehicle.vehicle_images?.length ?? 0) > 0,
    hasCosts: (vehicle.vehicle_costs?.length ?? 0) > 0,
    hasSellingPrice: vehicle.selling_price !== null,
    hasVin: Boolean(vehicle.vin?.trim()),
    hasRegistration: Boolean(vehicle.registration_number?.trim()),
    potentialMargin: profitability.potentialMargin,
    sellingPrice: vehicle.selling_price == null ? null : Number(vehicle.selling_price),
    latestMarketAnalysisAt: latestAnalysis?.analyzed_at ?? null,
    marketPositioning: latestAnalysis?.positioning ?? null,
  }
  const priority = calculateExecutivePriority(base, now)
  return {
    id: vehicle.id,
    name: [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" "),
    primaryImageUrl: primaryImage(vehicle),
    sellingPrice: base.sellingPrice,
    potentialMargin: profitability.potentialMargin,
    investedCapital: profitability.capitalInvested,
    ageDays: base.ageDays,
    status: vehicle.status,
    priorityScore: priority.score,
    priorityLevel: priority.level,
    reasons: priority.reasons,
    summary: priority.summary,
    detail: priority.detail,
  }
}

export class ExecutiveDashboardService {
  constructor(private readonly supabase: ExecutiveSupabaseClient) {}

  async getDashboard(now = new Date()): Promise<ExecutiveDashboardData | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return null

    const { data: memberships, error: membershipError } = await this.supabase
      .from("garage_members")
      .select("garage_id")
      .eq("user_id", user.id)
    if (membershipError) {
      console.error("Unable to read executive dashboard memberships", { code: membershipError.code, message: membershipError.message })
      throw new Error("Impossible de déterminer les garages accessibles.")
    }
    const garageIds = [...new Set((memberships ?? []).flatMap((item) => item.garage_id ? [item.garage_id] : []))]
    if (garageIds.length === 0) throw new Error("Aucun garage n'est associé à cet utilisateur.")

    const [garageResult, vehicleResult] = await Promise.all([
      this.supabase.from("garages").select("name").in("id", garageIds).order("created_at", { ascending: true }),
      this.supabase.from("vehicles").select(`
        id, brand, model, trim, status, purchase_price, selling_price, vin,
        registration_number, created_at,
        vehicle_costs (amount),
        vehicle_images (url, is_primary, created_at),
        marketplace_links (status, published_at),
        vehicle_market_analyses (analyzed_at, positioning)
      `)
        .in("garage_id", garageIds)
        .order("analyzed_at", { referencedTable: "vehicle_market_analyses", ascending: false })
        .limit(1, { referencedTable: "vehicle_market_analyses" }),
    ])
    if (garageResult.error || vehicleResult.error) {
      const error = garageResult.error ?? vehicleResult.error
      console.error("Unable to read executive dashboard", { code: error?.code, message: error?.message })
      throw new Error("Impossible de charger le tableau de bord dirigeant.")
    }

    const garages = garageResult.data ?? []
    const vehicles = (vehicleResult.data ?? []) as ExecutiveVehicleRow[]
    const activeVehicles = vehicles.filter((vehicle) => ACTIVE_STOCK_STATUSES.has(vehicle.status))
    const scoredVehicles = activeVehicles
      .map((vehicle) => toWatchedVehicle(vehicle, now))
      .sort((a, b) => b.priorityScore - a.priorityScore || b.ageDays - a.ageDays)
    const watchedVehicles = scoredVehicles.slice(0, 8)
    const staleLimit = new Date(now.getTime() - 30 * DAY_MS).getTime()

    const priorityDefinitions: ExecutivePriority[] = [
      { id: "purchase", count: activeVehicles.filter((v) => Number(v.purchase_price ?? 0) <= 0).length, label: "Sans prix d’achat", href: "/stock?missingPurchasePrice=true", tone: "danger" },
      { id: "selling", count: activeVehicles.filter((v) => v.selling_price == null).length, label: "Sans prix de vente", href: "/stock?missingSellingPrice=true", tone: "danger" },
      { id: "vin", count: activeVehicles.filter((v) => !v.vin?.trim()).length, label: "Sans VIN", href: "/stock?missingVin=true", tone: "warning" },
      { id: "registration", count: activeVehicles.filter((v) => !v.registration_number?.trim()).length, label: "Sans immatriculation", href: "/stock?missingRegistration=true", tone: "warning" },
      { id: "photo", count: activeVehicles.filter((v) => (v.vehicle_images?.length ?? 0) === 0).length, label: "Sans photo", href: "/stock?missingPhoto=true", tone: "warning" },
      { id: "cost", count: activeVehicles.filter((v) => (v.vehicle_costs?.length ?? 0) === 0).length, label: "Sans coût enregistré", href: "/stock?missingCost=true", tone: "warning" },
      { id: "analysis-missing", count: activeVehicles.filter((v) => (v.vehicle_market_analyses?.length ?? 0) === 0).length, label: "Sans analyse marché", href: "/stock", tone: "warning" },
      { id: "analysis-stale", count: activeVehicles.filter((v) => {
        const dates = (v.vehicle_market_analyses ?? []).map((analysis) => new Date(analysis.analyzed_at).getTime()).filter(Number.isFinite)
        return dates.length > 0 && Math.max(...dates) < staleLimit
      }).length, label: "Analyse marché de plus de 30 jours", href: "/stock", tone: "warning" },
    ]

    const publishedAges = activeVehicles.filter((v) => v.status === "PUBLISHED").map((v) => publishedAge(v, now))
    const financial = calculateExecutiveFinancialMetrics(activeVehicles)
    const incompleteVehicleCount = activeVehicles.filter((v) =>
      Number(v.purchase_price ?? 0) <= 0 || v.selling_price == null || !v.vin?.trim() ||
      !v.registration_number?.trim() || (v.vehicle_images?.length ?? 0) === 0 ||
      (v.vehicle_costs?.length ?? 0) === 0
    ).length
    return {
      garageName: garages.length === 1 ? garages[0].name : `${garages.length} garages accessibles`,
      financial,
      today: {
        garageName: garages.length === 1 ? garages[0].name || null : null,
        actionCount: priorityDefinitions.reduce((total, priority) => total + priority.count, 0),
        missingAnalysisCount: priorityDefinitions.find((priority) => priority.id === "analysis-missing")?.count ?? 0,
        incompleteVehicleCount,
        criticalVehicleCount: scoredVehicles.filter((vehicle) => vehicle.priorityLevel === "CRITICAL").length,
        potentialMargin: financial.potentialMargin,
      },
      activity: {
        preparation: vehicles.filter((v) => v.status === "PREPARATION").length,
        published: vehicles.filter((v) => v.status === "PUBLISHED").length,
        reserved: vehicles.filter((v) => v.status === "RESERVED").length,
        sold: vehicles.filter((v) => v.status === "SOLD").length,
        publishedOver30Days: publishedAges.filter((age) => age !== null && age > 30).length,
        publishedOver60Days: publishedAges.filter((age) => age !== null && age > 60).length,
        publishedOver90Days: publishedAges.filter((age) => age !== null && age > 90).length,
      },
      priorities: priorityDefinitions.filter((priority) => priority.count > 0),
      watchedVehicles,
    }
  }
}
