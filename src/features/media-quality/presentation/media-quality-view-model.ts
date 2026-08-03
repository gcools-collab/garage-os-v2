import type { CaptureAngle, MediaQualityReport } from "../types"

const ANGLE_LABELS: Readonly<Record<CaptureAngle, string>> = { FRONT_LEFT: "Avant gauche", FRONT: "Avant", FRONT_RIGHT: "Avant droit", RIGHT: "Côté droit", REAR_RIGHT: "Arrière droit", REAR: "Arrière", REAR_LEFT: "Arrière gauche", LEFT: "Côté gauche" }
export interface MediaQualityViewModel {
  readonly scoreLabel: string
  readonly starsLabel: string
  readonly stateLabel: string
  readonly summary: string
  readonly strengths: readonly string[]
  readonly weaknesses: readonly string[]
  readonly suggestions: readonly string[]
  readonly angles: readonly { readonly id: CaptureAngle; readonly label: string; readonly covered: boolean }[]
  readonly aiLabel: string
}
export function buildMediaQualityViewModel(report: MediaQualityReport): MediaQualityViewModel {
  return { scoreLabel: `${report.score}/100`, starsLabel: `${report.grade} étoile(s) sur 5`, stateLabel: report.state === "PASS" ? "Validé" : report.state === "BLOCKER" ? "À corriger" : "À améliorer", summary: report.summary, strengths: report.strengths.slice(0, 5), weaknesses: report.weaknesses.slice(0, 5), suggestions: report.suggestions.slice(0, 5), angles: (Object.keys(ANGLE_LABELS) as CaptureAngle[]).map((id) => ({ id, label: ANGLE_LABELS[id], covered: report.deterministic.capturedAngles.includes(id) })), aiLabel: report.aiAvailable ? "Suggestions IA" : "Analyse IA désactivée" }
}
