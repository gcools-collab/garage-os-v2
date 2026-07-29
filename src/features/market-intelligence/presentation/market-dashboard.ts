import type { Vehicle } from "@/features/public"
import { analyzeVehicleMarket } from "../engine"
import type {
  MarketAnalysis,
  MarketConfidence,
  MarketListing,
  MarketOpportunity,
  MarketPricePosition,
  MarketVehicle,
  MarketWarning,
} from "../engine"

export type PresentationTone = "positive" | "warning" | "danger" | "neutral"
export type MarketPresentationStatus = { key: string; label: string; tone: PresentationTone }
export type MarketMessage = { key: string; text: string }
export type MarketComparableRow = {
  id: string; title: string; price: string; year: string; mileage: string
  location: string; source: string; sellerType: string; href: string | null
}
export type MarketVehicleInsight = {
  vehicleId: string; vehicleLabel: string; vehicleImage: string | null; currentPrice: string
  marketPrice: string | null; recommendedPrice: string | null; recommendationNote: string | null
  priceGap: string | null; priceGapPercent: string | null
  position: MarketPresentationStatus; confidence: MarketPresentationStatus
  marketHealth: MarketPresentationStatus
  competitiveness: { value: number | null; label: string; tone: PresentationTone }
  comparableCount: number; warnings: MarketMessage[]; opportunities: MarketMessage[]
  href: string; detail: {
    statistics: Array<{ label: string; value: string }>
    comparables: MarketComparableRow[]
  }
}
export type MarketDashboardViewModel = {
  header: { title: string; description: string; helper: string }
  summary: Array<{ id: string; label: string; value: string; tone: PresentationTone }>
  priorityActions: Array<{
    vehicleId: string; vehicleLabel: string; severity: PresentationTone
    title: string; description: string; actionLabel: string; href: string
  }>
  vehicles: MarketVehicleInsight[]
  emptyState: { title: string; description: string } | null
}

export function toMarketVehicle(vehicle: Vehicle): MarketVehicle {
  return {
    id: vehicle.id, brand: vehicle.brand, model: vehicle.model, trim: vehicle.trim,
    year: vehicle.year, price: vehicle.sellingPrice, mileage: vehicle.mileage,
    fuel: vehicle.fuel, gearbox: vehicle.gearbox,
  }
}

export function formatMarketCurrency(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? null : new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(value)
}

const positionStatus: Record<MarketPricePosition, MarketPresentationStatus> = {
  UNDER_MARKET: { key: "UNDER_MARKET", label: "Sous le marché", tone: "warning" },
  MARKET: { key: "MARKET", label: "Bien positionné", tone: "positive" },
  OVER_MARKET: { key: "OVER_MARKET", label: "Au-dessus du marché", tone: "danger" },
  UNKNOWN: { key: "UNKNOWN", label: "Données insuffisantes", tone: "neutral" },
}
const confidenceStatus: Record<MarketConfidence, MarketPresentationStatus> = {
  VERY_LOW: { key: "VERY_LOW", label: "Confiance très faible", tone: "neutral" },
  LOW: { key: "LOW", label: "Confiance faible", tone: "warning" },
  MEDIUM: { key: "MEDIUM", label: "Confiance moyenne", tone: "warning" },
  HIGH: { key: "HIGH", label: "Confiance élevée", tone: "positive" },
}
const warningTexts: Record<MarketWarning, string> = {
  NOT_ENOUGH_DATA: "Le volume de comparables est encore insuffisant pour une recommandation fiable.",
  NO_COMPARABLE: "Aucune annonce suffisamment proche n’a été trouvée.",
  PRICE_TOO_HIGH: "Le prix affiché dépasse sensiblement la médiane des annonces comparables.",
  PRICE_TOO_LOW: "Le véhicule semble proposé sous le niveau du marché.",
}
const opportunityTexts: Record<MarketOpportunity, string> = {
  BAISSE_PRIX: "Étudier une baisse de prix.", HAUSSE_PRIX: "Une hausse de prix peut être envisagée.",
  BON_PRIX: "Le prix semble cohérent avec le marché.", MARCHE_FAIBLE: "Le marché paraît peu dynamique.",
  MARCHE_FORT: "Le marché présente un volume favorable.",
}

function scorePresentation(value: number | null) {
  if (value === null) return { value, label: "Non disponible", tone: "neutral" as const }
  if (value >= 80) return { value, label: "Excellent", tone: "positive" as const }
  if (value >= 60) return { value, label: "Bon", tone: "positive" as const }
  if (value >= 40) return { value, label: "Moyen", tone: "warning" as const }
  return { value, label: "Faible", tone: "danger" as const }
}

function comparableRow(listing: MarketListing): MarketComparableRow {
  const fallback = [listing.brand, listing.model, listing.year].filter(Boolean).join(" ")
  return {
    id: listing.id, title: listing.title?.trim() || fallback || "Annonce comparable",
    price: formatMarketCurrency(listing.price) ?? "Non renseigné", year: listing.year ? String(listing.year) : "Non renseignée",
    mileage: listing.mileage == null ? "Non renseigné" : `${new Intl.NumberFormat("fr-FR").format(listing.mileage)} km`,
    location: listing.city ?? listing.department ?? "Non renseignée", source: listing.source,
    sellerType: listing.dealer ? "Professionnel" : listing.privateSeller ? "Particulier" : "Non renseigné",
    href: listing.url ?? null,
  }
}

function insight(vehicle: Vehicle, analysis: MarketAnalysis): MarketVehicleInsight {
  const price = vehicle.sellingPrice ?? null
  const gap = price != null && analysis.medianPrice != null ? price - analysis.medianPrice : null
  const gapPercent = gap != null && analysis.medianPrice ? gap / analysis.medianPrice * 100 : null
  const healthTone: PresentationTone = analysis.marketHealth === "HOT" ? "positive" : analysis.marketHealth === "SLOW" ? "warning" : "neutral"
  return {
    vehicleId: vehicle.id, vehicleLabel: [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(" "),
    vehicleImage: vehicle.images.find((image) => image.isPrimary)?.url ?? vehicle.images[0]?.url ?? null,
    currentPrice: formatMarketCurrency(price) ?? "Non renseigné",
    marketPrice: formatMarketCurrency(analysis.medianPrice), recommendedPrice: formatMarketCurrency(analysis.recommendedPrice),
    recommendationNote: analysis.recommendedPrice == null ? null : analysis.confidence === "HIGH"
      ? "Recommandation basée sur un volume significatif de comparables."
      : "Estimation indicative — données limitées.",
    priceGap: gap == null ? null : `${gap >= 0 ? "+" : "−"}${formatMarketCurrency(Math.abs(gap))}`,
    priceGapPercent: gapPercent == null ? null : `${gapPercent >= 0 ? "+" : "−"}${Math.abs(Math.round(gapPercent))} %`,
    position: positionStatus[analysis.pricePosition], confidence: confidenceStatus[analysis.confidence],
    marketHealth: { key: analysis.marketHealth, label: analysis.marketHealth === "HOT" ? "Marché dynamique" : analysis.marketHealth === "SLOW" ? "Marché lent" : analysis.marketHealth === "NORMAL" ? "Marché normal" : "Données insuffisantes", tone: healthTone },
    competitiveness: scorePresentation(analysis.competitivenessScore), comparableCount: analysis.listingCount,
    warnings: analysis.warnings.map((key) => ({ key, text: warningTexts[key] })),
    opportunities: analysis.opportunities.map((key) => ({ key, text: opportunityTexts[key] })),
    href: `/stock/${vehicle.id}`,
    detail: {
      statistics: [
        ["Prix garage", formatMarketCurrency(price)], ["Prix médian", formatMarketCurrency(analysis.medianPrice)],
        ["Prix moyen", formatMarketCurrency(analysis.averagePrice)], ["Minimum", formatMarketCurrency(analysis.minPrice)],
        ["Maximum", formatMarketCurrency(analysis.maxPrice)], ["Prix recommandé", formatMarketCurrency(analysis.recommendedPrice)],
      ].map(([label, value]) => ({ label: label ?? "", value: value ?? "Non renseigné" })),
      comparables: analysis.comparables.map(comparableRow),
    },
  }
}

export function buildMarketDashboard({ vehicles, listings }: { vehicles: readonly Vehicle[]; listings: readonly MarketListing[] }): MarketDashboardViewModel {
  if (!vehicles.length) return { header: { title: "Intelligence marché", description: "Analyse du positionnement tarifaire de votre stock.", helper: "0 véhicule analysé" }, summary: [], priorityActions: [], vehicles: [], emptyState: { title: "Aucun véhicule à analyser", description: "Ajoutez des véhicules au stock pour commencer l’analyse du marché." } }
  if (!listings.length) return { header: { title: "Intelligence marché", description: "Analyse du positionnement tarifaire de votre stock.", helper: "Aucune donnée marché" }, summary: [], priorityActions: [], vehicles: [], emptyState: { title: "Pas encore assez de données marché", description: "Importez des annonces comparables pour obtenir des recommandations tarifaires." } }
  const insights = vehicles.map((vehicle) => insight(vehicle, analyzeVehicleMarket(toMarketVehicle(vehicle), listings)))
  const positionOrder = { OVER_MARKET: 0, UNDER_MARKET: 1, MARKET: 2, UNKNOWN: 3 }
  insights.sort((a, b) => positionOrder[a.position.key as MarketPricePosition] - positionOrder[b.position.key as MarketPricePosition] || b.comparableCount - a.comparableCount || a.vehicleLabel.localeCompare(b.vehicleLabel) || a.vehicleId.localeCompare(b.vehicleId))
  const priorities = insights.map((item) => {
    const high = item.warnings.some((warning) => warning.key === "PRICE_TOO_HIGH")
    const low = item.warnings.some((warning) => warning.key === "PRICE_TOO_LOW")
    return { item, rank: high && item.confidence.key === "HIGH" ? 0 : high ? 1 : low ? 2 : item.comparableCount === 0 ? 3 : 5 }
  }).sort((a, b) => a.rank - b.rank || a.item.vehicleLabel.localeCompare(b.item.vehicleLabel)).slice(0, 5)
  const garagePrices = vehicles.flatMap((vehicle) => vehicle.sellingPrice == null ? [] : [vehicle.sellingPrice])
  const marketPrices = insights.flatMap((item) => item.marketPrice ? [Number(item.marketPrice.replace(/[^\d]/g, ""))] : [])
  const count = (key: MarketPricePosition) => insights.filter((item) => item.position.key === key).length
  return {
    header: { title: "Intelligence marché", description: "Analyse du positionnement tarifaire de votre stock à partir des annonces comparables.", helper: `${insights.length} véhicule${insights.length > 1 ? "s" : ""} analysé${insights.length > 1 ? "s" : ""}` },
    summary: [
      { id: "analyzed", label: "Véhicules analysés", value: String(insights.length), tone: "neutral" },
      { id: "over", label: "Au-dessus du marché", value: String(count("OVER_MARKET")), tone: "danger" },
      { id: "market", label: "Bien positionnés", value: String(count("MARKET")), tone: "positive" },
      { id: "under", label: "Sous le marché", value: String(count("UNDER_MARKET")), tone: "warning" },
      { id: "confidence", label: "Confiance élevée", value: String(insights.filter((item) => item.confidence.key === "HIGH").length), tone: "positive" },
      { id: "priorities", label: "Actions prioritaires", value: String(priorities.filter((priority) => priority.rank < 5).length), tone: "warning" },
      { id: "garage-price", label: "Prix moyen garage", value: formatMarketCurrency(garagePrices.length ? garagePrices.reduce((sum, price) => sum + price, 0) / garagePrices.length : null) ?? "Non disponible", tone: "neutral" },
      { id: "market-price", label: "Prix moyen marché", value: formatMarketCurrency(marketPrices.length ? marketPrices.reduce((sum, price) => sum + price, 0) / marketPrices.length : null) ?? "Non disponible", tone: "neutral" },
    ],
    priorityActions: priorities.map(({ item, rank }) => ({
      vehicleId: item.vehicleId, vehicleLabel: item.vehicleLabel, severity: rank === 0 ? "danger" : rank < 3 ? "warning" : "neutral",
      title: item.warnings[0]?.text ?? "Positionnement cohérent", description: `${item.currentPrice} — marché ${item.marketPrice ?? "non disponible"}`,
      actionLabel: rank < 3 ? "Vérifier le prix" : "Voir l’analyse", href: item.href,
    })),
    vehicles: insights, emptyState: null,
  }
}
