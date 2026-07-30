import type { AcquisitionOpportunity } from "../../types/opportunity"
import type { RecommendationFactor } from "../types"

const CONDITION_IMPACT = {
  EXCELLENT: 8, GOOD: 4, FAIR: 0, POOR: -12, UNKNOWN: -5,
} as const

function ageImpact(year: number | null, currentYear: number): number {
  if (year === null) return -4
  const age = Math.max(0, currentYear - year)
  if (age <= 3) return 4
  if (age <= 7) return 2
  if (age <= 12) return 0
  if (age <= 20) return -3
  return -6
}

function mileageImpact(mileage: number | null): number {
  if (mileage === null) return -4
  if (mileage <= 50_000) return 5
  if (mileage <= 100_000) return 2
  if (mileage <= 150_000) return 0
  if (mileage <= 200_000) return -5
  return -10
}

export function buildRecommendationFactors(
  opportunity: AcquisitionOpportunity,
  now: Date
): readonly RecommendationFactor[] {
  const documentCategories = new Set(opportunity.documents.map((item) => item.category))
  const informationValues = [
    opportunity.brand, opportunity.model, opportunity.year, opportunity.mileage,
    opportunity.fuel, opportunity.gearbox, opportunity.vin, opportunity.registration,
  ]
  const informationCount = informationValues.filter((value) => value !== null && value !== "").length
  const hasHistory = documentCategories.has("SERVICE_BOOK") || documentCategories.has("INVOICE")
  const photoCount = opportunity.documents.filter((item) => item.category === "PHOTO").length
  const documentCount = opportunity.documents.filter((item) => item.category !== "PHOTO").length
  return [
    {
      code: "ASKING_PRICE", label: "Prix demandé", weight: 20,
      impact: opportunity.askingPrice === null || opportunity.askingPrice <= 0 ? -20 : 0,
      explanation: opportunity.askingPrice === null || opportunity.askingPrice <= 0
        ? "Le prix demandé manque ou est nul : aucune recommandation de prix ne peut être calculée."
        : `Le prix demandé de ${Math.round(opportunity.askingPrice).toLocaleString("fr-FR")} € constitue la référence déclarative, pas une donnée marché.`,
    },
    {
      code: "CONDITION", label: "État général", weight: 15,
      impact: CONDITION_IMPACT[opportunity.generalCondition],
      explanation: opportunity.generalCondition === "UNKNOWN"
        ? "L’état général n’est pas évalué."
        : `L’état général déclaré est ${opportunity.generalCondition.toLowerCase()}.`,
    },
    {
      code: "VEHICLE_AGE", label: "Âge", weight: 10,
      impact: ageImpact(opportunity.year, now.getUTCFullYear()),
      explanation: opportunity.year === null
        ? "L’année manque et réduit la précision."
        : `L’année ${opportunity.year} est intégrée à l’estimation préliminaire.`,
    },
    {
      code: "MILEAGE", label: "Kilométrage", weight: 15,
      impact: mileageImpact(opportunity.mileage),
      explanation: opportunity.mileage === null
        ? "Le kilométrage manque et réduit la précision."
        : `${opportunity.mileage.toLocaleString("fr-FR")} km sont pris en compte.`,
    },
    {
      code: "REPAIR_ESTIMATE", label: "Travaux", weight: 15,
      impact: opportunity.repairEstimate === null ? -5 : opportunity.repairEstimate > 5_000 ? -10 : 0,
      explanation: opportunity.repairEstimate === null
        ? "Aucune estimation de travaux n’est renseignée ; aucun coût caché n’est inventé."
        : `${Math.round(opportunity.repairEstimate).toLocaleString("fr-FR")} € de travaux déclarés sont déduits de la marge.`,
    },
    {
      code: "INFORMATION_QUALITY", label: "Qualité des informations", weight: 10,
      impact: Math.round((informationCount / informationValues.length) * 20 - 10),
      explanation: `${informationCount} information(s) structurante(s) sur ${informationValues.length} sont renseignées.`,
    },
    {
      code: "DOCUMENTS", label: "Documents", weight: 5,
      impact: documentCount ? Math.min(6, documentCount * 2) : -5,
      explanation: documentCount ? `${documentCount} document(s) sont disponibles.` : "Aucun document n’est disponible.",
    },
    {
      code: "PHOTOS", label: "Photos", weight: 5,
      impact: photoCount ? Math.min(5, photoCount) : -5,
      explanation: photoCount ? `${photoCount} photo(s) accompagnent le dossier.` : "Aucune photo n’accompagne le dossier.",
    },
    {
      code: "HISTORY", label: "Historique", weight: 3,
      impact: hasHistory ? 5 : -3,
      explanation: hasHistory ? "Un carnet ou des factures documentent l’historique." : "L’historique d’entretien n’est pas documenté.",
    },
    {
      code: "PROVENANCE", label: "Provenance", weight: 2,
      impact: opportunity.provenance === "PROFESSIONAL_NETWORK" ? 3 : 0,
      explanation: "La provenance est conservée pour expliquer et comparer les futures décisions.",
    },
  ]
}

export function getResaleAdjustmentPercent(
  factors: readonly RecommendationFactor[]
): number {
  const codes = new Set(["CONDITION", "VEHICLE_AGE", "MILEAGE"])
  const raw = factors.filter((factor) => codes.has(factor.code))
    .reduce((total, factor) => total + factor.impact, 0)
  return Math.max(-20, Math.min(12, raw))
}
