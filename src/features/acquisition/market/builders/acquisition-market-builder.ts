import type {
  AcquisitionMarketAnalysis,
  MarketAnalysisContext,
} from "../types"
import type { AcquisitionMarketViewModel } from "../presentation"
import { buildGeographicMarketViewModel } from "../geography"

const money = new Intl.NumberFormat("fr-FR", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0,
})
const integer = new Intl.NumberFormat("fr-FR")
const CONFIDENCE = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée" } as const
const SIGNAL_LABELS = {
  LOW_SUPPLY: "Offre limitée", HIGH_SUPPLY: "Offre abondante",
  FAST_ROTATION: "Rotation rapide", SLOW_ROTATION: "Rotation lente",
  UNDER_PRICED: "Sous le marché", OVER_PRICED: "Au-dessus du marché",
  HIGH_DEMAND: "Demande soutenue", LOW_DEMAND: "Demande limitée",
  LIMITED_DATA: "Données limitées", OUTLIERS_DETECTED: "Valeurs aberrantes",
} as const

export function buildAcquisitionMarketViewModel(
  analysis: AcquisitionMarketAnalysis
): AcquisitionMarketViewModel {
  return {
    title: "Marché",
    description: analysis.providerAvailable
      ? "Indicateurs calculés à partir d’annonces comparables normalisées."
      : analysis.providerMessage ?? "Source marché indisponible.",
    available: analysis.comparableCount > 0,
    metrics: [
      { label: "Comparables", value: integer.format(analysis.comparableCount) },
      { label: "Prix minimum", value: analysis.minimumPrice === null ? "Non disponible" : money.format(analysis.minimumPrice) },
      { label: "Médiane des prix affichés", value: analysis.medianPrice === null ? "Non disponible" : money.format(analysis.medianPrice) },
      { label: "Prix maximum", value: analysis.maximumPrice === null ? "Non disponible" : money.format(analysis.maximumPrice) },
      { label: "Prix moyen", value: analysis.averagePrice === null ? "Non disponible" : money.format(analysis.averagePrice) },
      { label: "Dispersion", value: analysis.priceDispersion === null ? "Non disponible" : `${analysis.priceDispersion.toLocaleString("fr-FR")} %` },
      { label: "Kilométrage moyen", value: analysis.averageMileage === null ? "Non disponible" : `${integer.format(analysis.averageMileage)} km` },
      { label: "Âge moyen des annonces", value: analysis.averageListingAgeDays === null ? "Non disponible" : `${analysis.averageListingAgeDays.toLocaleString("fr-FR")} jours` },
      { label: "Confiance", value: CONFIDENCE[analysis.confidence] },
      { label: "Fraîcheur", value: analysis.freshnessDays === null ? "Non disponible" : `Collecté il y a ${analysis.freshnessDays} jour(s)` },
    ],
    signals: analysis.signals.map((signal) => ({
      code: signal.code,
      label: SIGNAL_LABELS[signal.code],
      explanation: signal.explanation,
      tone: signal.level === "POSITIVE" ? "positive" : signal.level === "WARNING" || signal.level === "CRITICAL" ? "warning" : "neutral",
    })),
    comparables: analysis.comparables.map((item) => ({
      id: `${item.source}:${item.externalId}`,
      source: item.source,
      price: money.format(item.advertisedPrice),
      details: [
        item.year, item.mileage === null ? null : `${integer.format(item.mileage)} km`,
        item.fuel, item.gearbox,
      ].filter((value): value is string | number => value !== null).join(" · "),
      location: item.location ?? "Localisation inconnue",
      geographicDetail: (() => {
        const geographic = analysis.geography.comparables.find(
          (candidate) => candidate.externalId === item.externalId
        )
        if (!geographic || geographic.distanceKm === null) {
          return "Distance non disponible · Zone nationale"
        }
        const radius = geographic.radiusKm
          ? `Rayon ${geographic.radiusKm} km`
          : "Hors rayon 100 km"
        return `${geographic.distanceKm.toLocaleString("fr-FR")} km · ${radius} · Zone ${geographic.zone.toLowerCase()}`
      })(),
      href: item.url,
      dataQuality: `${item.dataQuality} % de données`,
      similarity: `${item.similarityScore}/100 de similarité`,
      explanation: [
        item.selectionReason,
        ...item.matchedCriteria,
        ...item.importantDifferences,
      ].join(" · "),
    })),
    geography: buildGeographicMarketViewModel(analysis.geography),
    emptyMessage: analysis.comparableCount ? null : analysis.providerAvailable
      ? "Aucun comparable suffisamment proche n’a été trouvé."
      : analysis.providerMessage,
  }
}

export function buildMarketAnalysisContext(
  analysis: AcquisitionMarketAnalysis
): MarketAnalysisContext {
  return {
    comparableCount: analysis.comparableCount,
    medianPrice: analysis.medianPrice,
    priceRange: [analysis.minimumPrice, analysis.maximumPrice],
    confidence: analysis.confidence,
    marketScore: analysis.marketScore,
    freshnessDays: analysis.freshnessDays,
    signals: analysis.signals.map((signal) => ({
      code: signal.code, explanation: signal.explanation,
    })),
    comparableEvidence: analysis.comparables.slice(0, 10).map((item) => ({
      source: item.source, price: item.advertisedPrice, year: item.year,
      mileage: item.mileage, location: item.location,
    })),
    geography: {
      available: analysis.geography.available,
      heatScore: analysis.geography.heatScore,
      localMedianPrice: analysis.geography.localMedianPrice,
      nationalMedianPrice: analysis.geography.nationalMedianPrice,
      localNationalDifferencePercent: analysis.geography.localNationalDifferencePercent,
      signals: analysis.geography.signals.map((signal) => ({
        code: signal.code,
        explanation: signal.explanation,
      })),
    },
  }
}
