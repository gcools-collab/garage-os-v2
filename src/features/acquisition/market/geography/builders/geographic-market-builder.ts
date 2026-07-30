import type { GeographicMarketAnalysis, GeographicMarketViewModel, LocalMarketSignalCode } from "../types"

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })
const LABELS: Readonly<Record<LocalMarketSignalCode, string>> = {
  LOCAL_RARE: "Rare localement",
  LOCAL_COMMON: "Courant localement",
  LOCAL_UNDERVALUED: "Marché local moins cher",
  LOCAL_OVERVALUED: "Marché local plus cher",
  LONG_DISTANCE_BUY: "Déplacement à prévoir",
  LOCAL_OPPORTUNITY: "Opportunité locale",
  LOCAL_SATURATION: "Marché local saturé",
}

export function buildGeographicMarketViewModel(
  analysis: GeographicMarketAnalysis
): GeographicMarketViewModel {
  return {
    title: "Répartition géographique",
    description: analysis.message ?? "Comparaison reproductible du marché autour du garage et au niveau national.",
    metrics: [
      ...analysis.radii.map((radius) => ({
        label: `${radius.radiusKm} km`,
        value: radius.listingCount === null ? "Non disponible" : String(radius.listingCount),
      })),
      { label: "National", value: String(analysis.nationalListingCount) },
      { label: "Prix médian local", value: analysis.localMedianPrice === null ? "Non disponible" : money.format(analysis.localMedianPrice) },
      { label: "Prix médian national", value: analysis.nationalMedianPrice === null ? "Non disponible" : money.format(analysis.nationalMedianPrice) },
      { label: "Différence", value: analysis.localNationalDifferencePercent === null ? "Non disponible" : `${number.format(analysis.localNationalDifferencePercent)} %` },
      { label: "Local Market Heat", value: analysis.heatScore === null ? "Non disponible" : `${analysis.heatScore}/100` },
    ],
    signals: analysis.signals.map((signal) => ({
      code: signal.code,
      label: LABELS[signal.code],
      explanation: signal.explanation,
    })),
  }
}
