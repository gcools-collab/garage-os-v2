import { garageIntelligenceFixture } from "../engine"
import type { GarageIntelligenceData, GarageStockVehicle } from "../engine"
import type {
  DashboardListItemViewModel,
  DashboardTone,
  GarageDashboardViewModel,
} from "../types"

const DAY_MS = 86_400_000
const ACTIVE_STATUSES = new Set(["PURCHASED", "PREPARATION", "READY_TO_PUBLISH", "PUBLISHED", "RESERVED"])
const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})
const integer = new Intl.NumberFormat("fr-FR")
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

function daysBetween(start: string, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - new Date(start).getTime()) / DAY_MS))
}

function capitalInvested(vehicle: GarageStockVehicle) {
  return (vehicle.purchasePrice ?? 0) + vehicle.costs.reduce((total, cost) => total + cost, 0)
}

function item(
  id: string,
  title: string,
  description: string,
  tone: DashboardTone
): DashboardListItemViewModel {
  return { id, title, description, tone }
}

export function buildGarageDashboard(
  data: GarageIntelligenceData = garageIntelligenceFixture
): GarageDashboardViewModel {
  const now = new Date(data.referenceDate)
  const activeStock = data.stock.filter((vehicle) => ACTIVE_STATUSES.has(vehicle.status))
  const stockValue = activeStock.reduce((total, vehicle) => total + (vehicle.sellingPrice ?? 0), 0)
  const investedCapital = activeStock.reduce((total, vehicle) => total + capitalInvested(vehicle), 0)
  const potentialMargin = activeStock.reduce(
    (total, vehicle) => total + (vehicle.sellingPrice === null ? 0 : vehicle.sellingPrice - capitalInvested(vehicle)),
    0
  )
  const recentSales = data.sales.filter((sale) => daysBetween(sale.soldAt, now) <= 30)
  const rotationBase = activeStock.length + recentSales.length
  const rotationRate = rotationBase === 0 ? 0 : (recentSales.length / rotationBase) * 100
  const analyzedVehicleIds = new Set(data.marketAnalyses.map((analysis) => analysis.vehicleId))
  const missingAnalysisCount = activeStock.filter((vehicle) => !analyzedVehicleIds.has(vehicle.id)).length

  const priorities = [
    activeStock.some((vehicle) => vehicle.sellingPrice === null)
      ? item("selling-price", "Définir les prix de vente manquants", "Un véhicule ne peut pas être piloté sans objectif de vente.", "danger")
      : null,
    activeStock.some((vehicle) => !vehicle.hasPhotos)
      ? item("photos", "Compléter les dossiers photos", "Au moins un véhicule du stock ne possède aucune photo.", "warning")
      : null,
    data.preparations.some((preparation) => !preparation.completed && new Date(preparation.dueAt) < now)
      ? item("preparation", "Traiter les préparations en retard", "Une échéance de préparation est dépassée.", "danger")
      : null,
    missingAnalysisCount > 0
      ? item("market-analysis", "Lancer les analyses marché", `${integer.format(missingAnalysisCount)} véhicule${missingAnalysisCount > 1 ? "s" : ""} sans analyse récente.`, "warning")
      : null,
  ].filter((priority): priority is DashboardListItemViewModel => priority !== null)

  const alerts = [
    ...activeStock
      .filter((vehicle) => !vehicle.hasDocuments)
      .map((vehicle) => item(`documents-${vehicle.id}`, "Documents incomplets", vehicle.label, "warning")),
    ...activeStock
      .filter((vehicle) => vehicle.technicalInspectionDueAt !== null)
      .filter((vehicle) => daysBetween(data.referenceDate, new Date(vehicle.technicalInspectionDueAt!)) <= 30)
      .map((vehicle) => item(`ct-${vehicle.id}`, "Contrôle technique à anticiper", vehicle.label, "warning")),
    ...activeStock
      .filter((vehicle) => daysBetween(vehicle.createdAt, now) > 60)
      .map((vehicle) => item(`stagnation-${vehicle.id}`, "Véhicule en stock depuis plus de 60 jours", vehicle.label, "danger")),
    ...data.preparations
      .filter((preparation) => !preparation.completed && new Date(preparation.dueAt) < now)
      .map((preparation) => item(`preparation-${preparation.id}`, "Préparation en retard", preparation.label, "danger")),
  ]

  const recommendations = [
    missingAnalysisCount > 0
      ? item("recommendation-market", "Analyser les véhicules sans référence marché", "Priorisez les véhicules publiés ou prêts à publier.", "info")
      : null,
    activeStock.some((vehicle) => vehicle.sellingPrice === null)
      ? item("recommendation-price", "Fixer un prix avant la mise en ligne", "Un prix cible rend la marge potentielle immédiatement exploitable.", "info")
      : null,
    rotationRate < 30 && activeStock.length > 0
      ? item("recommendation-rotation", "Accélérer la rotation du stock", "Réévaluez en priorité les véhicules les plus anciens.", "info")
      : null,
  ].filter((recommendation): recommendation is DashboardListItemViewModel => recommendation !== null)

  const timeline = [...data.activities]
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt))
    .slice(0, 6)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      dateLabel: shortDate.format(new Date(activity.occurredAt)),
      tone: activity.kind === "SALE" ? "positive" as const : activity.kind === "MARKET" ? "info" as const : "neutral" as const,
    }))

  return {
    summary: {
      eyebrow: data.garageName,
      title: data.userFirstName.trim() ? `Bonjour ${data.userFirstName.trim()}` : "Bonjour",
      description: "Voici les points essentiels pour piloter votre garage aujourd’hui.",
      indicators: [
        { id: "priorities", value: integer.format(priorities.length), label: "actions prioritaires", tone: priorities.length > 0 ? "warning" : "positive" },
        { id: "alerts", value: integer.format(alerts.length), label: "alertes", tone: alerts.length > 0 ? "danger" : "positive" },
        { id: "recommendations", value: integer.format(recommendations.length), label: "recommandations IA", tone: "info" },
      ],
    },
    business: {
      title: "Pilotage du garage",
      description: "Stock, rentabilité et opérations réunis dans une vue quotidienne.",
    },
    kpis: [
      { id: "stock", label: "Stock", value: integer.format(activeStock.length), detail: "véhicules actifs", tone: "neutral" },
      { id: "stock-value", label: "Valeur du stock", value: currency.format(stockValue), detail: "prix de vente renseignés", tone: "neutral" },
      { id: "invested-capital", label: "Capital immobilisé", value: currency.format(investedCapital), detail: "achats et frais engagés", tone: "warning" },
      { id: "potential-margin", label: "Marge potentielle", value: currency.format(potentialMargin), detail: "sur les prix renseignés", tone: potentialMargin >= 0 ? "positive" : "danger" },
      { id: "rotation", label: "Rotation", value: `${rotationRate.toFixed(1).replace(".", ",")} %`, detail: "ventes des 30 derniers jours", tone: rotationRate >= 30 ? "positive" : "warning" },
    ],
    priorities,
    alerts,
    recommendations,
    timeline,
  }
}
