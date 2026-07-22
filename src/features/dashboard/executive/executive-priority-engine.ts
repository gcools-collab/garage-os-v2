import type { VehicleStatus } from "@/features/vehicles/status/vehicle-status"
import type { ExecutivePriorityLevel } from "./types"

export type PriorityEngineVehicle = {
  ageDays: number
  status: VehicleStatus
  hasPhotos: boolean
  hasCosts: boolean
  hasSellingPrice: boolean
  hasVin: boolean
  hasRegistration: boolean
  potentialMargin: number | null
  sellingPrice: number | null
  latestMarketAnalysisAt: string | null
  marketPositioning: "BELOW_MARKET" | "IN_MARKET" | "ABOVE_MARKET" | null
}

export type PriorityEngineResult = {
  score: number
  level: ExecutivePriorityLevel
  reasons: string[]
  summary: string
  detail: string
}

type Finding = { points: number; reason: string; summary: string; detail: string }
const DAY_MS = 86_400_000

function levelFor(score: number): ExecutivePriorityLevel {
  if (score > 60) return "CRITICAL"
  if (score > 35) return "HIGH"
  if (score > 15) return "MEDIUM"
  return "LOW"
}

export function calculateExecutivePriority(vehicle: PriorityEngineVehicle, now = new Date()): PriorityEngineResult {
  const findings: Finding[] = []
  const add = (condition: boolean, finding: Finding) => { if (condition) findings.push(finding) }

  add(!vehicle.hasSellingPrice, { points: 30, reason: "Prix de vente absent", summary: "Prix de vente manquant", detail: "Définir le prix avant publication" })
  add(!vehicle.hasPhotos, { points: 25, reason: "Photos manquantes", summary: "Photos manquantes", detail: "Compléter le dossier du véhicule" })
  add(vehicle.ageDays > 90, { points: 30, reason: `${vehicle.ageDays} jours en stock`, summary: `${vehicle.ageDays} jours en stock`, detail: "Vérifier le prix et la stratégie de vente" })
  if (vehicle.ageDays > 60 && vehicle.ageDays <= 90) findings.push({ points: 20, reason: `${vehicle.ageDays} jours en stock`, summary: `${vehicle.ageDays} jours en stock`, detail: "Vérifier le positionnement du véhicule" })
  if (vehicle.ageDays > 30 && vehicle.ageDays <= 60) findings.push({ points: 10, reason: `${vehicle.ageDays} jours en stock`, summary: `${vehicle.ageDays} jours en stock`, detail: "Surveiller le délai de rotation" })
  add(!vehicle.hasVin, { points: 10, reason: "VIN manquant", summary: "Identification incomplète", detail: "Renseigner le VIN" })
  add(!vehicle.hasRegistration, { points: 10, reason: "Immatriculation manquante", summary: "Identification incomplète", detail: "Renseigner l’immatriculation" })
  add(!vehicle.hasCosts, { points: 8, reason: "Aucun coût enregistré", summary: "Coûts non renseignés", detail: "Vérifier les frais engagés" })

  if (!vehicle.latestMarketAnalysisAt) {
    findings.push({ points: 20, reason: "Analyse marché inexistante", summary: "Analyse marché à lancer", detail: "Contrôler le positionnement du prix" })
  } else {
    const analysisAge = Math.floor((now.getTime() - new Date(vehicle.latestMarketAnalysisAt).getTime()) / DAY_MS)
    add(analysisAge > 30, { points: 10, reason: `Analyse marché vieille de ${analysisAge} jours`, summary: "Analyse marché à actualiser", detail: "Relancer une analyse du marché" })
  }

  if (vehicle.potentialMargin !== null && vehicle.sellingPrice && vehicle.sellingPrice > 0) {
    const marginRate = (vehicle.potentialMargin / vehicle.sellingPrice) * 100
    add(vehicle.potentialMargin < 0, { points: 30, reason: "Marge potentielle négative", summary: "Marge négative", detail: "Revoir le prix ou les coûts" })
    if (vehicle.potentialMargin >= 0 && marginRate < 5) findings.push({ points: 20, reason: `Marge limitée à ${marginRate.toFixed(1)} %`, summary: "Marge très faible", detail: "Vérifier la rentabilité" })
    if (marginRate >= 5 && marginRate < 10) findings.push({ points: 10, reason: `Marge limitée à ${marginRate.toFixed(1)} %`, summary: "Marge faible", detail: "Surveiller la rentabilité" })
  }
  add(vehicle.marketPositioning === "ABOVE_MARKET", { points: 10, reason: "Prix au-dessus du marché", summary: "Prix au-dessus du marché", detail: "Vérifier le positionnement" })

  findings.sort((a, b) => b.points - a.points)
  const score = Math.min(100, findings.reduce((total, finding) => total + finding.points, 0))
  const primary = findings[0]
  const positiveSummary = vehicle.marketPositioning === "BELOW_MARKET"
    ? { summary: "Sous le marché", detail: "Analyse récente disponible" }
    : { summary: "Dossier sous contrôle", detail: "Aucune alerte importante" }

  return {
    score,
    level: levelFor(score),
    reasons: findings.map((finding) => finding.reason),
    summary: primary?.summary ?? positiveSummary.summary,
    detail: primary?.detail ?? positiveSummary.detail,
  }
}
