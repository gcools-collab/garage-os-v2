import type {
  GarageMarketLocation,
  GeographicComparableInput,
  GeographicMarketAnalysis,
  GeographicRadius,
  LocalMarketSignal,
} from "../types"
import { calculateDistanceKm } from "./distance"

const RADII: readonly GeographicRadius[] = [25, 50, 100]

function median(values: readonly number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function buildSignals(input: {
  localCount: number
  localMedian: number | null
  nationalMedian: number | null
  averageDistance: number | null
  heatScore: number
}): readonly LocalMarketSignal[] {
  const signals: LocalMarketSignal[] = []
  if (input.localCount <= 2) signals.push({ code: "LOCAL_RARE", explanation: "Deux comparables au plus sont observés dans un rayon de 100 km." })
  if (input.localCount >= 8) signals.push({ code: "LOCAL_COMMON", explanation: "Au moins huit comparables sont observés dans un rayon de 100 km." })
  if (input.localCount >= 12 || input.heatScore >= 75) signals.push({ code: "LOCAL_SATURATION", explanation: "Le volume et la concentration des annonces indiquent une forte concurrence locale." })
  if (input.localMedian !== null && input.nationalMedian !== null) {
    if (input.localMedian <= input.nationalMedian * 0.95) signals.push({ code: "LOCAL_UNDERVALUED", explanation: "La médiane locale est au moins 5 % sous la médiane nationale." })
    if (input.localMedian >= input.nationalMedian * 1.05) signals.push({ code: "LOCAL_OVERVALUED", explanation: "La médiane locale est au moins 5 % au-dessus de la médiane nationale." })
    if (input.localCount <= 4 && input.localMedian > input.nationalMedian) signals.push({ code: "LOCAL_OPPORTUNITY", explanation: "Une offre locale rare coïncide avec une médiane supérieure au niveau national." })
  }
  if (input.averageDistance !== null && input.averageDistance > 100) signals.push({ code: "LONG_DISTANCE_BUY", explanation: "Les comparables se situent en moyenne à plus de 100 km." })
  return signals
}

export function analyzeGeographicMarket(input: {
  readonly origin: GarageMarketLocation
  readonly comparables: readonly GeographicComparableInput[]
}): GeographicMarketAnalysis {
  const origin = input.origin.coordinates
  const comparables = input.comparables.map((item) => {
    const distanceKm = origin && item.coordinates
      ? calculateDistanceKm(origin, item.coordinates)
      : null
    const radiusKm = distanceKm === null
      ? null
      : RADII.find((radius) => distanceKm <= radius) ?? null
    return {
      externalId: item.externalId,
      location: item.location,
      postalCode: item.postalCode,
      coordinates: item.coordinates,
      distanceKm,
      radiusKm,
      zone: distanceKm === null || distanceKm > 100
        ? "NATIONAL" as const
        : distanceKm <= 50 ? "LOCAL" as const : "REGIONAL" as const,
    }
  })
  const distances = comparables.flatMap((item) => item.distanceKm === null ? [] : [item.distanceKm])
  const localIds = new Set(comparables.filter((item) => item.distanceKm !== null && item.distanceKm <= 100).map((item) => item.externalId))
  const localPrices = input.comparables.filter((item) => localIds.has(item.externalId)).map((item) => item.advertisedPrice)
  const nationalPrices = input.comparables.map((item) => item.advertisedPrice)
  const localMedianPrice = median(localPrices)
  const nationalMedianPrice = median(nationalPrices)
  const distanceSpread = distances.length
    ? Math.min(100, ((Math.max(...distances) - Math.min(...distances)) / 100) * 100)
    : 0
  const localCount = localPrices.length
  const heatScore = origin
    ? Math.round(Math.min(100, localCount * 8 + Math.min(20, input.comparables.length * 2) + distanceSpread * 0.15))
    : null
  const averageDistanceKm = distances.length
    ? round(distances.reduce((total, value) => total + value, 0) / distances.length)
    : null
  const signals = heatScore === null ? [] : buildSignals({
    localCount,
    localMedian: localMedianPrice,
    nationalMedian: nationalMedianPrice,
    averageDistance: averageDistanceKm,
    heatScore,
  })
  return {
    available: origin !== null && distances.length > 0,
    origin: input.origin,
    radii: RADII.map((radiusKm) => ({
      radiusKm,
      listingCount: origin ? comparables.filter((item) => item.distanceKm !== null && item.distanceKm <= radiusKm).length : null,
    })),
    nationalListingCount: input.comparables.length,
    localMedianPrice,
    nationalMedianPrice,
    localNationalDifferencePercent: localMedianPrice !== null && nationalMedianPrice
      ? round(((localMedianPrice - nationalMedianPrice) / nationalMedianPrice) * 100)
      : null,
    averageDistanceKm,
    medianDistanceKm: median(distances),
    heatScore,
    signals,
    comparables,
    mapPoints: input.comparables.flatMap((item) => item.coordinates ? [{
      externalId: item.externalId,
      coordinates: item.coordinates,
      distanceKm: comparables.find((comparable) => comparable.externalId === item.externalId)?.distanceKm ?? null,
      advertisedPrice: item.advertisedPrice,
    }] : []),
    message: origin
      ? distances.length ? null : "Les annonces ne fournissent pas de coordonnées exploitables."
      : "Ajoutez les coordonnées du garage pour activer les distances et les rayons locaux.",
  }
}
