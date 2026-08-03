import type { MediaAiInsight, MediaQualityDeterministicAnalysis, MediaQualityReport, MediaQualityWeights } from "../types"
import type { MediaQualityItem } from "../types"
import { MediaQualityEngine } from "../engine"

export const DEFAULT_MEDIA_QUALITY_WEIGHTS: MediaQualityWeights = { coverage: 0.4, technical: 0.2, consistency: 0.2, ai: 0.2 }
export class MediaQualityReportBuilder {
  build(deterministic: MediaQualityDeterministicAnalysis, ai: MediaAiInsight | null, weights: MediaQualityWeights = DEFAULT_MEDIA_QUALITY_WEIGHTS): MediaQualityReport {
    const deterministicWeight = weights.coverage + weights.technical + weights.consistency
    const score = ai
      ? Math.round(deterministic.coverageScore * weights.coverage + deterministic.technicalScore * weights.technical + deterministic.consistencyScore * weights.consistency + ai.score * weights.ai)
      : Math.round((deterministic.coverageScore * weights.coverage + deterministic.technicalScore * weights.technical + deterministic.consistencyScore * weights.consistency) / deterministicWeight)
    const bounded = Math.max(0, Math.min(100, score))
    const state = deterministic.blockers.length ? "BLOCKER" : deterministic.warnings.length || (ai?.findings.length ?? 0) ? "WARNING" : "PASS"
    return { score: bounded, grade: Math.max(1, Math.min(5, Math.ceil(bounded / 20))) as 1 | 2 | 3 | 4 | 5, state, title: "Qualité des médias", summary: deterministic.blockers.length ? `${deterministic.blockers.length} blocage(s) technique(s)` : deterministic.warnings.length ? `${deterministic.warnings.length} point(s) à vérifier` : "Shooting prêt", strengths: deterministic.strengths, weaknesses: deterministic.weaknesses, suggestions: ai?.findings.map((finding) => finding.suggestion) ?? [], deterministic, ai, aiAvailable: ai !== null }
  }
}

export function buildDeterministicMediaQualityReport(items: readonly MediaQualityItem[], mode: "360" | "GALLERY" = "GALLERY") {
  return new MediaQualityReportBuilder().build(new MediaQualityEngine().analyze(items, mode), null)
}
