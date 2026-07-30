import type { GarageIntelligenceSourceData } from "../data"
import type {
  GarageIntelligenceSnapshot,
  IntelligenceMarketPosition,
  RecommendationConfidence,
} from "../types"

const DAY_MS = 86_400_000
const unavailableStatuses = new Set(["SOLD", "DELIVERED", "ARCHIVED", "CANCELLED"])

function number(value: number | string | null) {
  if (value === null) return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function cents(value: number | string | null) {
  const parsed = number(value)
  return parsed === null ? null : Math.round(parsed * 100)
}

function daysSince(value: string | null, now: Date) {
  return value === null ? null : Math.max(0, Math.floor((now.getTime() - Date.parse(value)) / DAY_MS))
}

function marketConfidence(count: number): RecommendationConfidence {
  return count >= 15 ? "HIGH" : count >= 5 ? "MEDIUM" : "LOW"
}

function completeness(vehicle: GarageIntelligenceSourceData["vehicles"][number], photoCount: number) {
  const checks = [
    Boolean(vehicle.brand.trim()),
    Boolean(vehicle.model.trim()),
    vehicle.year !== null,
    vehicle.mileage !== null,
    Boolean(vehicle.fuel),
    Boolean(vehicle.gearbox),
    vehicle.selling_price !== null,
    Boolean(vehicle.description?.trim()),
    photoCount > 0,
    Boolean(vehicle.vin),
    Boolean(vehicle.registration_number),
  ]
  return Math.round(checks.filter(Boolean).length / checks.length * 100)
}

export function buildGarageIntelligenceSnapshot(input: {
  readonly garage: { readonly id: string; readonly name: string; readonly timezone: string }
  readonly source: GarageIntelligenceSourceData
  readonly now: Date
}): GarageIntelligenceSnapshot {
  const costs = new Map<string, number>()
  for (const row of input.source.costs) {
    costs.set(row.vehicle_id, (costs.get(row.vehicle_id) ?? 0) + (cents(row.amount) ?? 0))
  }
  const photos = new Map<string, number>()
  for (const row of input.source.images) {
    if (row.type !== "DOCUMENT") photos.set(row.vehicle_id, (photos.get(row.vehicle_id) ?? 0) + 1)
  }
  const latestMarket = new Map<string, IntelligenceMarketPosition>()
  for (const row of input.source.marketAnalyses) {
    if (latestMarket.has(row.vehicle_id)) continue
    latestMarket.set(row.vehicle_id, {
      comparableCount: row.comparable_count,
      minimumPriceCents: cents(row.minimum_price),
      maximumPriceCents: cents(row.maximum_price),
      averagePriceCents: cents(row.average_price),
      medianPriceCents: cents(row.median_price),
      priceDifferenceCents: cents(row.price_difference),
      priceDifferencePercent: number(row.price_difference_percent),
      confidence: marketConfidence(row.comparable_count),
      analyzedAt: row.analyzed_at,
    })
  }
  const leadCount = new Map<string, number>()
  const recentLeadCount = new Map<string, number>()
  for (const lead of input.source.leads) {
    if (!lead.vehicle_id) continue
    leadCount.set(lead.vehicle_id, (leadCount.get(lead.vehicle_id) ?? 0) + 1)
    if (input.now.getTime() - Date.parse(lead.created_at) <= 30 * DAY_MS) {
      recentLeadCount.set(lead.vehicle_id, (recentLeadCount.get(lead.vehicle_id) ?? 0) + 1)
    }
  }
  const vehicles = input.source.vehicles.map((vehicle) => {
    const priceCents = cents(vehicle.selling_price)
    const purchasePriceCents = cents(vehicle.purchase_price)
    const preparationCostCents = costs.get(vehicle.id) ?? 0
    const capitalInvestedCents = (purchasePriceCents ?? 0) + preparationCostCents
    const photoCount = photos.get(vehicle.id) ?? 0
    return {
      id: vehicle.id,
      liveSlug: vehicle.live_slug,
      title: [vehicle.brand, vehicle.model, vehicle.trim ?? vehicle.version].filter(Boolean).join(" "),
      status: vehicle.status,
      publicationStatus: vehicle.publication_status,
      priceCents,
      purchasePriceCents,
      preparationCostCents,
      estimatedMarginCents: priceCents === null ? null : priceCents - capitalInvestedCents,
      capitalInvestedCents,
      daysInStock: daysSince(vehicle.created_at, input.now) ?? 0,
      daysPublished: daysSince(vehicle.published_at, input.now),
      photoCount,
      hasDescription: Boolean(vehicle.description?.trim()),
      completenessScore: completeness(vehicle, photoCount),
      publishedAt: vehicle.published_at,
      lastPriceChangeAt: null,
      updatedAt: vehicle.updated_at,
      marketPosition: latestMarket.get(vehicle.id) ?? null,
      leadCount: leadCount.get(vehicle.id) ?? 0,
      recentLeadCount: recentLeadCount.get(vehicle.id) ?? 0,
      vehicleUrl: null,
      dashboardUrl: `/stock/${vehicle.id}`,
    }
  })
  const activeVehicles = vehicles.filter((vehicle) => !unavailableStatuses.has(vehicle.status))
  return {
    garage: input.garage,
    generatedAt: input.now.toISOString(),
    vehicles,
    leads: input.source.leads.map((lead) => ({
      id: lead.id,
      customerName: lead.customer_name,
      status: lead.status,
      type: lead.type,
      vehicleId: lead.vehicle_id,
      vehicleTitle: lead.vehicle_title_snapshot ?? "Demande générale",
      createdAt: lead.created_at,
      firstContactedAt: lead.first_contacted_at,
      lastContactedAt: lead.last_contacted_at,
      preferredDate: lead.preferred_date,
      nextActionAt: lead.next_action_at,
      href: `/leads/${lead.id}`,
    })),
    commercialTasks: input.source.tasks.map((task) => ({
      id: task.id,
      leadId: task.lead_id,
      vehicleId: task.vehicle_id,
      type: task.type,
      status: task.status,
      title: task.title,
      dueAt: task.due_at,
      snoozedUntil: task.snoozed_until,
      href: task.lead_id ? `/leads/${task.lead_id}` : "/commercial",
    })),
    acquisitionOpportunities: [],
    previousRecommendations: input.source.recommendations.map((item) => ({
      id: item.id,
      recommendationKey: item.recommendation_key,
      type: item.type,
      category: item.category,
      entityType: item.entity_type,
      entityId: item.entity_id,
      score: item.score,
      payload: item.payload,
      status: item.status,
      snoozedUntil: item.snoozed_until,
      dismissedAt: item.dismissed_at,
      lastDetectedAt: item.last_detected_at,
    })),
    metrics: {
      stockValueCents: activeVehicles.reduce((sum, vehicle) => sum + (vehicle.priceCents ?? 0), 0),
      capitalInvestedCents: activeVehicles.reduce((sum, vehicle) => sum + vehicle.capitalInvestedCents, 0),
      potentialMarginCents: activeVehicles.reduce((sum, vehicle) => sum + (vehicle.estimatedMarginCents ?? 0), 0),
    },
  }
}
