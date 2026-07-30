import { resolveEffectiveTaskStatus } from "@/features/commercial/engine"
import type { GarageIntelligenceConfig } from "../config"
import type {
  GarageIntelligenceSnapshot,
  IntelligenceSignal,
  IntelligenceSignalCategory,
  IntelligenceSignalType,
  IntelligenceSeverity,
} from "../types"
import { computeAcquisitionOpportunityScore } from "./price-recommendation"

function signal(input: {
  readonly type: IntelligenceSignalType
  readonly category: IntelligenceSignalCategory
  readonly severity: IntelligenceSeverity
  readonly entityType: IntelligenceSignal["entityType"]
  readonly entityId: string
  readonly title: string
  readonly facts: IntelligenceSignal["facts"]
  readonly now: Date
}): IntelligenceSignal {
  return {
    id: `${input.type.toLowerCase()}:${input.entityId}`,
    type: input.type,
    category: input.category,
    severity: input.severity,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    facts: input.facts,
    detectedAt: input.now.toISOString(),
    expiresAt: null,
  }
}

const closedLeadStatuses = new Set(["WON", "LOST", "ARCHIVED"])
const unavailableVehicleStatuses = new Set(["SOLD", "DELIVERED", "ARCHIVED", "CANCELLED"])

export function detectCommercialSignals(
  snapshot: GarageIntelligenceSnapshot,
  config: GarageIntelligenceConfig,
  now: Date
): readonly IntelligenceSignal[] {
  const signals: IntelligenceSignal[] = []
  for (const lead of snapshot.leads) {
    if (!closedLeadStatuses.has(lead.status) && lead.firstContactedAt === null) {
      const ageHours = (now.getTime() - Date.parse(lead.createdAt)) / 3_600_000
      if (ageHours >= config.uncontactedLeadHours) {
        signals.push(signal({
          type: "LEAD_UNCONTACTED",
          category: "COMMERCIAL",
          severity: ageHours >= 24 ? "CRITICAL" : "HIGH",
          entityType: "lead",
          entityId: lead.id,
          title: lead.customerName,
          facts: { ageHours: Math.floor(ageHours), vehicleTitle: lead.vehicleTitle },
          now,
        }))
      }
    }
    const vehicle = lead.vehicleId
      ? snapshot.vehicles.find((candidate) => candidate.id === lead.vehicleId)
      : null
    if (
      !closedLeadStatuses.has(lead.status)
      && vehicle
      && unavailableVehicleStatuses.has(vehicle.status)
    ) {
      signals.push(signal({
        type: "ACTIVE_LEAD_VEHICLE_UNAVAILABLE",
        category: "COMMERCIAL",
        severity: "HIGH",
        entityType: "lead",
        entityId: lead.id,
        title: lead.customerName,
        facts: { vehicleTitle: vehicle.title },
        now,
      }))
    }
    const appointmentAt = lead.preferredDate ? Date.parse(`${lead.preferredDate}T12:00:00`) : NaN
    const appointmentHours = (appointmentAt - now.getTime()) / 3_600_000
    const confirmed = snapshot.commercialTasks.some((task) =>
      task.leadId === lead.id
      && task.type === "CONFIRM_APPOINTMENT"
      && task.status === "COMPLETED"
    )
    if (
      ["APPOINTMENT_REQUEST", "TEST_DRIVE_REQUEST"].includes(lead.type)
      && Number.isFinite(appointmentHours)
      && appointmentHours >= 0
      && appointmentHours <= config.appointmentConfirmationHours
      && !confirmed
    ) {
      signals.push(signal({
        type: "APPOINTMENT_UNCONFIRMED",
        category: "APPOINTMENT",
        severity: appointmentHours <= 4 ? "CRITICAL" : "HIGH",
        entityType: "lead",
        entityId: lead.id,
        title: lead.customerName,
        facts: { appointmentHours: Math.ceil(appointmentHours), vehicleTitle: lead.vehicleTitle },
        now,
      }))
    }
  }
  for (const task of snapshot.commercialTasks) {
    const effective = resolveEffectiveTaskStatus({
      status: task.status as "OPEN" | "IN_PROGRESS" | "COMPLETED" | "SNOOZED" | "CANCELLED",
      snoozed_until: task.snoozedUntil,
    }, now)
    if (
      task.dueAt
      && ["OPEN", "IN_PROGRESS"].includes(effective)
      && now.getTime() - Date.parse(task.dueAt) >= config.overdueTaskMinutes * 60_000
    ) {
      signals.push(signal({
        type: "COMMERCIAL_TASK_OVERDUE",
        category: "COMMERCIAL",
        severity: "HIGH",
        entityType: "commercial_task",
        entityId: task.id,
        title: task.title,
        facts: {
          overdueMinutes: Math.floor((now.getTime() - Date.parse(task.dueAt)) / 60_000),
          leadId: task.leadId,
        },
        now,
      }))
    }
  }
  return signals
}

export function detectStockSignals(
  snapshot: GarageIntelligenceSnapshot,
  config: GarageIntelligenceConfig,
  now: Date
): readonly IntelligenceSignal[] {
  return snapshot.vehicles.flatMap((vehicle): IntelligenceSignal[] => {
    if (unavailableVehicleStatuses.has(vehicle.status)) return []
    const signals: IntelligenceSignal[] = []
    if (vehicle.daysInStock >= config.agingVehicleDays) {
      signals.push(signal({
        type: "VEHICLE_AGING", category: "STOCK",
        severity: vehicle.daysInStock >= config.stagnatingVehicleDays ? "HIGH" : "MEDIUM",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: { daysInStock: vehicle.daysInStock, capitalInvestedCents: vehicle.capitalInvestedCents },
        now,
      }))
    }
    if (
      vehicle.daysPublished !== null
      && vehicle.daysPublished >= config.stagnatingVehicleDays
      && vehicle.recentLeadCount === 0
    ) {
      signals.push(signal({
        type: "VEHICLE_STAGNATING", category: "STOCK", severity: "HIGH",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: { daysPublished: vehicle.daysPublished, recentLeadCount: vehicle.recentLeadCount },
        now,
      }))
    }
    if (
      vehicle.capitalInvestedCents >= config.highCapitalThresholdCents
      && vehicle.daysInStock >= config.agingVehicleDays
    ) {
      signals.push(signal({
        type: "HIGH_CAPITAL_IMMOBILIZATION", category: "PROFITABILITY", severity: "HIGH",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: { capitalInvestedCents: vehicle.capitalInvestedCents, daysInStock: vehicle.daysInStock },
        now,
      }))
    }
    return signals
  })
}

export function detectPricingSignals(
  snapshot: GarageIntelligenceSnapshot,
  config: GarageIntelligenceConfig,
  now: Date
): readonly IntelligenceSignal[] {
  return snapshot.vehicles.flatMap((vehicle): IntelligenceSignal[] => {
    const market = vehicle.marketPosition
    if (!market || vehicle.priceCents === null) return []
    const sufficientComparables = market.comparableCount >= config.minimumComparableCount
    const sufficientConfidence = market.confidence !== "LOW"
    if (!sufficientComparables || !sufficientConfidence) {
      return [signal({
        type: "LOW_MARKET_CONFIDENCE", category: "PRICING", severity: "LOW",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: { comparableCount: market.comparableCount, confidence: market.confidence },
        now,
      })]
    }
    if (
      market.priceDifferencePercent !== null
      && market.priceDifferencePercent >= config.aboveMarketPercent
    ) {
      return [signal({
        type: "VEHICLE_ABOVE_MARKET", category: "PRICING", severity: "HIGH",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: {
          priceDifferenceCents: market.priceDifferenceCents,
          priceDifferencePercent: market.priceDifferencePercent,
          comparableCount: market.comparableCount,
          medianPriceCents: market.medianPriceCents,
        },
        now,
      })]
    }
    return []
  })
}

export function detectPublicationSignals(
  snapshot: GarageIntelligenceSnapshot,
  _config: GarageIntelligenceConfig,
  now: Date
): readonly IntelligenceSignal[] {
  return snapshot.vehicles.flatMap((vehicle): IntelligenceSignal[] => {
    if (unavailableVehicleStatuses.has(vehicle.status)) return []
    const signals: IntelligenceSignal[] = []
    if (
      ["READY_TO_PUBLISH", "PUBLISHED"].includes(vehicle.status)
      && vehicle.publicationStatus !== "PUBLISHED"
      && vehicle.completenessScore >= 80
    ) {
      signals.push(signal({
        type: "READY_NOT_PUBLISHED", category: "PUBLICATION", severity: "HIGH",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: { completenessScore: vehicle.completenessScore },
        now,
      }))
    }
    if (vehicle.photoCount === 0) {
      signals.push(signal({
        type: "MISSING_PHOTOS", category: "DATA_QUALITY", severity: "MEDIUM",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: { photoCount: 0 },
        now,
      }))
    }
    if (!vehicle.hasDescription) {
      signals.push(signal({
        type: "MISSING_DESCRIPTION", category: "DATA_QUALITY", severity: "LOW",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: { hasDescription: false },
        now,
      }))
    }
    return signals
  })
}

export function detectProfitabilitySignals(
  snapshot: GarageIntelligenceSnapshot,
  config: GarageIntelligenceConfig,
  now: Date
): readonly IntelligenceSignal[] {
  return snapshot.vehicles.flatMap((vehicle): IntelligenceSignal[] =>
    vehicle.estimatedMarginCents !== null
    && vehicle.estimatedMarginCents < config.minimumEstimatedMarginCents
    && !unavailableVehicleStatuses.has(vehicle.status)
      ? [signal({
        type: "LOW_ESTIMATED_MARGIN", category: "PROFITABILITY", severity: "MEDIUM",
        entityType: "vehicle", entityId: vehicle.id, title: vehicle.title,
        facts: { estimatedMarginCents: vehicle.estimatedMarginCents },
        now,
      })]
      : []
  )
}

export function detectAcquisitionSignals(
  snapshot: GarageIntelligenceSnapshot,
  config: GarageIntelligenceConfig,
  now: Date
): readonly IntelligenceSignal[] {
  return snapshot.acquisitionOpportunities.flatMap((opportunity): IntelligenceSignal[] => {
    const score = computeAcquisitionOpportunityScore(opportunity, config, now)
    return score && score.level !== "LOW" ? [signal({
      type: score.level === "HIGH" ? "HIGH_MARGIN_OPPORTUNITY" : "ACQUISITION_OPPORTUNITY",
      category: "ACQUISITION",
      severity: score.level === "HIGH" ? "HIGH" : "MEDIUM",
      entityType: "acquisition_opportunity",
      entityId: opportunity.id,
      title: opportunity.title,
      facts: { score: score.score, estimatedMarginCents: score.estimatedMarginCents },
      now,
    })] : []
  })
}

export function detectGarageIntelligenceSignals(
  snapshot: GarageIntelligenceSnapshot,
  config: GarageIntelligenceConfig,
  now: Date
) {
  return [
    ...detectCommercialSignals(snapshot, config, now),
    ...detectStockSignals(snapshot, config, now),
    ...detectPricingSignals(snapshot, config, now),
    ...detectPublicationSignals(snapshot, config, now),
    ...detectProfitabilitySignals(snapshot, config, now),
    ...detectAcquisitionSignals(snapshot, config, now),
  ]
}
