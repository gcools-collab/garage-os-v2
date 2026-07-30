import type { GarageIntelligenceBrief } from "../engine"
import type {
  GarageDailyBriefViewModel,
  GarageRecommendation,
  GarageRecommendationViewModel,
  IntelligenceRecommendationStatus,
  IntelligenceSignalCategory,
} from "../types"

export type IntelligenceBriefFilter = {
  readonly category?: IntelligenceSignalCategory
  readonly status?: IntelligenceRecommendationStatus
}

const categoryLabels: Readonly<Record<IntelligenceSignalCategory, string>> = {
  COMMERCIAL: "Commercial",
  STOCK: "Stock",
  PRICING: "Prix",
  PUBLICATION: "Publication",
  APPOINTMENT: "Rendez-vous",
  ACQUISITION: "Acquisition",
  PROFITABILITY: "Rentabilité",
  DATA_QUALITY: "Qualité des données",
}
const impactLabels = {
  VERY_HIGH: "Impact commercial très élevé",
  HIGH: "Impact élevé",
  MEDIUM: "Impact modéré",
  LOW: "Impact limité",
} as const
const urgencyLabels = {
  IMMEDIATE: "Action immédiate",
  TODAY: "À traiter aujourd’hui",
  SOON: "À traiter prochainement",
  WHEN_POSSIBLE: "Quand possible",
} as const
const confidenceLabels = {
  HIGH: "Confiance élevée",
  MEDIUM: "Confiance moyenne",
  LOW: "Confiance faible",
} as const
const statusLabels: Readonly<Record<IntelligenceRecommendationStatus, string>> = {
  ACTIVE: "Active",
  COMPLETED: "Déclarée terminée",
  DISMISSED: "Ignorée",
  SNOOZED: "Reportée",
  RESOLVED: "Résolue",
}
const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" })
const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0,
})

function formatEvidence(value: string) {
  const suggested = value.match(/^Prix suggéré calculé : (-?\d+) centimes$/)
  if (suggested) return `Prix suggéré : ${currency.format(Number(suggested[1]) / 100)}`
  return value
}

function ctaLabel(item: GarageRecommendation) {
  if (item.entityType === "lead") return "Ouvrir le prospect"
  if (item.entityType === "vehicle") return "Ouvrir le véhicule"
  if (item.entityType === "commercial_task") return "Ouvrir la tâche"
  return "Étudier l’opportunité"
}

function recommendationViewModel(
  item: GarageRecommendation,
  rank: number
): GarageRecommendationViewModel {
  return {
    id: item.recommendationKey,
    rank,
    category: item.category,
    categoryLabel: categoryLabels[item.category],
    action: item.action,
    subject: item.subject,
    primaryReason: item.reasons[0] ?? "Une situation mérite votre attention.",
    secondaryReasons: item.reasons.slice(1),
    impactLabel: impactLabels[item.impact],
    urgencyLabel: urgencyLabels[item.urgency],
    effortLabel: `Temps estimé : ${item.effortMinutes} min`,
    confidenceLabel: confidenceLabels[item.confidence],
    evidence: item.evidence.map(formatEvidence),
    href: item.href,
    ctaLabel: ctaLabel(item),
    status: item.status,
    statusLabel: statusLabels[item.status],
    snoozedUntilLabel: item.snoozedUntil ? dateTime.format(new Date(item.snoozedUntil)) : null,
  }
}

function payloadString(payload: Readonly<Record<string, unknown>>, key: string, fallback: string) {
  return typeof payload[key] === "string" ? payload[key] : fallback
}

function payloadStrings(payload: Readonly<Record<string, unknown>>, key: string) {
  return Array.isArray(payload[key])
    ? payload[key].filter((value): value is string => typeof value === "string")
    : []
}

function resolvedViewModel(
  item: GarageIntelligenceBrief["snapshot"]["previousRecommendations"][number],
  rank: number
): GarageRecommendationViewModel {
  const href = payloadString(item.payload, "href", "/intelligence")
  return {
    id: item.recommendationKey,
    rank,
    category: item.category,
    categoryLabel: categoryLabels[item.category],
    action: payloadString(item.payload, "action", "Action résolue"),
    subject: payloadString(item.payload, "subject", "Garage OS"),
    primaryReason: payloadStrings(item.payload, "reasons")[0] ?? "La situation détectée n’est plus présente.",
    secondaryReasons: payloadStrings(item.payload, "reasons").slice(1),
    impactLabel: "Impact traité",
    urgencyLabel: "Situation résolue",
    effortLabel: "Aucune action requise",
    confidenceLabel: "Résolution vérifiée dans les données",
    evidence: payloadStrings(item.payload, "evidence").map(formatEvidence),
    href: href.startsWith("/") && !href.startsWith("//") ? href : "/intelligence",
    ctaLabel: item.entityType === "lead" ? "Voir le prospect" : "Voir l’élément",
    status: "RESOLVED",
    statusLabel: statusLabels.RESOLVED,
    snoozedUntilLabel: null,
  }
}

export function buildGarageDailyBriefViewModel(
  brief: GarageIntelligenceBrief,
  filter: IntelligenceBriefFilter = {}
): GarageDailyBriefViewModel {
  const active = brief.recommendations.filter((item) => item.status === "ACTIVE")
  const filtered = brief.recommendations.filter((item) =>
    (!filter.category || item.category === filter.category)
    && (!filter.status || item.status === filter.status)
  )
  const counts = new Map<IntelligenceSignalCategory, number>()
  for (const item of active) counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  const signals = brief.signals
  const concernedVehicleIds = new Set(signals
    .filter((item) => item.entityType === "vehicle")
    .map((item) => item.entityId))
  const concernedVehicles = brief.snapshot.vehicles.filter((item) => concernedVehicleIds.has(item.id))
  const resolved = filter.status === "RESOLVED"
    ? brief.snapshot.previousRecommendations
      .filter((item) => item.status === "RESOLVED")
      .map(resolvedViewModel)
    : []
  const recommendations = [
    ...filtered.map(recommendationViewModel),
    ...resolved.filter((item) => !filtered.some((current) => current.recommendationKey === item.id)),
  ]
  return {
    greeting: `Bonjour, ${brief.snapshot.garage.name}.`,
    generatedAtLabel: `Brief généré le ${dateTime.format(new Date(brief.snapshot.generatedAt))}`,
    headline: active.length
      ? `${active.length} action${active.length > 1 ? "s importantes" : " importante"} aujourd’hui`
      : "Tout est sous contrôle",
    summary: active[0]
      ? `Priorité : ${active[0].action}.`
      : "Aucune priorité urgente n’a été détectée pour le moment.",
    topRecommendations: active.slice(0, 5).map(recommendationViewModel),
    recommendations,
    categorySummaries: [...counts.entries()].map(([category, count]) => ({
      category, label: categoryLabels[category], count,
    })),
    metrics: {
      activeActions: active.length,
      urgentActions: active.filter((item) => item.urgency === "IMMEDIATE").length,
      uncontactedLeads: signals.filter((item) => item.type === "LEAD_UNCONTACTED").length,
      overdueTasks: signals.filter((item) => item.type === "COMMERCIAL_TASK_OVERDUE").length,
      appointmentsToConfirm: signals.filter((item) => item.type === "APPOINTMENT_UNCONFIRMED").length,
      agingVehicles: signals.filter((item) => item.type === "VEHICLE_AGING").length,
      aboveMarketVehicles: signals.filter((item) => item.type === "VEHICLE_ABOVE_MARKET").length,
      unpublishedVehicles: signals.filter((item) => item.type === "READY_NOT_PUBLISHED").length,
      acquisitionOpportunities: signals.filter((item) => item.category === "ACQUISITION").length,
      concernedCapitalLabel: concernedVehicles.length
        ? currency.format(concernedVehicles.reduce((sum, item) => sum + item.capitalInvestedCents, 0))
        : null,
      potentialMarginLabel: concernedVehicles.some((item) => item.estimatedMarginCents !== null)
        ? currency.format(concernedVehicles.reduce((sum, item) => sum + (item.estimatedMarginCents ?? 0), 0))
        : null,
    },
    emptyState: recommendations.length ? null : {
      title: brief.snapshot.vehicles.length ? "Tout est sous contrôle." : "Ajoutez votre premier véhicule.",
      description: brief.snapshot.vehicles.length
        ? "Aucune priorité urgente n’a été détectée pour le moment."
        : "Ajoutez votre premier véhicule pour commencer à recevoir des recommandations.",
    },
    intelligenceHref: "/intelligence",
  }
}
