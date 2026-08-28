import type { GarageIntelligenceBrief } from "../engine"
import type {
  GarageActivity,
  GarageIntelligenceData,
  GarageMarketAnalysis,
  GaragePreparation,
  GarageSale,
  GarageStockVehicle,
  IntelligenceVehicleStatus,
} from "../engine/garage-data"
import { buildGarageDashboard } from "./build-garage-dashboard"
import type { GarageDashboardViewModel } from "../types"

const DAY_MS = 86_400_000
const ACTIVE_STATUSES = new Set<IntelligenceVehicleStatus>([
  "PURCHASED",
  "PREPARATION",
  "READY_TO_PUBLISH",
  "PUBLISHED",
  "RESERVED",
])
const ACTIVITY_WINDOW_DAYS = 30

function centsToEuros(value: number | null) {
  return value === null ? null : value / 100
}

function marketPosition(
  priceDifferencePercent: number | null
): GarageMarketAnalysis["position"] {
  if (priceDifferencePercent === null) return "UNKNOWN"
  if (priceDifferencePercent > 2) return "OVER_MARKET"
  if (priceDifferencePercent < -2) return "UNDER_MARKET"
  return "MARKET"
}

function stockVehicleFromSnapshot(
  vehicle: GarageIntelligenceBrief["snapshot"]["vehicles"][number],
  now: Date
): GarageStockVehicle {
  const status = vehicle.status as IntelligenceVehicleStatus
  return {
    id: vehicle.id,
    label: vehicle.title,
    status,
    purchasePrice: centsToEuros(vehicle.purchasePriceCents),
    sellingPrice: centsToEuros(vehicle.priceCents),
    costs:
      vehicle.preparationCostCents > 0
        ? [vehicle.preparationCostCents / 100]
        : [],
    createdAt: new Date(
      now.getTime() - vehicle.daysInStock * DAY_MS
    ).toISOString(),
    hasPhotos: vehicle.photoCount > 0,
    hasDocuments: true,
    technicalInspectionDueAt: null,
  }
}

function buildActivities(
  brief: GarageIntelligenceBrief,
  now: Date
): readonly GarageActivity[] {
  const cutoff = now.getTime() - ACTIVITY_WINDOW_DAYS * DAY_MS
  const activities: GarageActivity[] = []

  for (const lead of brief.snapshot.leads) {
    if (Date.parse(lead.createdAt) < cutoff) continue
    activities.push({
      id: `lead-${lead.id}`,
      title: "Nouveau prospect",
      description: `${lead.customerName} — ${lead.vehicleTitle}`,
      occurredAt: lead.createdAt,
      kind: "STOCK",
    })
  }

  for (const vehicle of brief.snapshot.vehicles) {
    if (vehicle.status === "SOLD" && Date.parse(vehicle.updatedAt) >= cutoff) {
      activities.push({
        id: `sale-${vehicle.id}`,
        title: "Véhicule vendu",
        description: vehicle.title,
        occurredAt: vehicle.updatedAt,
        kind: "SALE",
      })
    }
    if (
      vehicle.marketPosition &&
      Date.parse(vehicle.marketPosition.analyzedAt) >= cutoff
    ) {
      activities.push({
        id: `market-${vehicle.id}`,
        title: "Analyse marché",
        description: vehicle.title,
        occurredAt: vehicle.marketPosition.analyzedAt,
        kind: "MARKET",
      })
    }
  }

  for (const task of brief.snapshot.commercialTasks) {
    if (task.status !== "COMPLETED" || !task.dueAt) continue
    if (Date.parse(task.dueAt) < cutoff) continue
    activities.push({
      id: `task-${task.id}`,
      title: "Tâche commerciale terminée",
      description: task.title,
      occurredAt: task.dueAt,
      kind: "PREPARATION",
    })
  }

  return activities.sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt)
  )
}

export function mapBriefToGarageIntelligenceData(
  brief: GarageIntelligenceBrief,
  options: {
    readonly userFirstName?: string
    readonly now?: Date
  } = {}
): GarageIntelligenceData {
  const now = options.now ?? new Date(brief.snapshot.generatedAt)
  const stock = brief.snapshot.vehicles.map((vehicle) =>
    stockVehicleFromSnapshot(vehicle, now)
  )
  const marketAnalyses: GarageMarketAnalysis[] = brief.snapshot.vehicles.flatMap(
    (vehicle) => {
      if (!vehicle.marketPosition) return []
      return [
        {
          vehicleId: vehicle.id,
          analyzedAt: vehicle.marketPosition.analyzedAt,
          position: marketPosition(vehicle.marketPosition.priceDifferencePercent),
        },
      ]
    }
  )
  const preparations: GaragePreparation[] = brief.snapshot.commercialTasks.flatMap(
    (task) => {
      if (!task.dueAt) return []
      return [
        {
          id: task.id,
          vehicleId: task.vehicleId ?? task.id,
          label: task.title,
          dueAt: task.dueAt,
          completed: task.status === "COMPLETED",
        },
      ]
    }
  )
  const sales: GarageSale[] = brief.snapshot.vehicles.flatMap((vehicle) => {
    if (vehicle.status !== "SOLD") return []
    return [
      {
        id: vehicle.id,
        vehicleId: vehicle.id,
        soldAt: vehicle.updatedAt,
        sellingPrice: (vehicle.priceCents ?? 0) / 100,
      },
    ]
  })

  return {
    userFirstName: options.userFirstName?.trim() ?? "",
    referenceDate: now.toISOString(),
    stock,
    marketAnalyses,
    preparations,
    sales,
    activities: buildActivities(brief, now),
  }
}

export function buildGarageDashboardFromBrief(
  brief: GarageIntelligenceBrief,
  context: { readonly garageName: string; readonly userFirstName?: string },
  now = new Date(brief.snapshot.generatedAt)
): GarageDashboardViewModel {
  return buildGarageDashboard({
    data: mapBriefToGarageIntelligenceData(brief, {
      userFirstName: context.userFirstName,
      now,
    }),
    context: { garageName: context.garageName },
  })
}

export function emptyGarageIntelligenceData(
  now = new Date()
): GarageIntelligenceData {
  return {
    userFirstName: "",
    referenceDate: now.toISOString(),
    stock: [],
    marketAnalyses: [],
    preparations: [],
    sales: [],
    activities: [],
  }
}

export function isGarageIntelligenceDataEmpty(data: GarageIntelligenceData) {
  return (
    data.stock.length === 0 &&
    data.sales.length === 0 &&
    data.activities.length === 0
  )
}

export function activeStockCount(data: GarageIntelligenceData) {
  return data.stock.filter((vehicle) => ACTIVE_STATUSES.has(vehicle.status))
    .length
}
