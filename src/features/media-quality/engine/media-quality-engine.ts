import { hammingDistance, histogramDistance } from "../analysis"
import type { CaptureAngle, MediaQualityDeterministicAnalysis, MediaQualityItem, MediaQualityRuleResult } from "../types"

const ANGLES: readonly CaptureAngle[] = ["FRONT_LEFT", "FRONT", "FRONT_RIGHT", "RIGHT", "REAR_RIGHT", "REAR", "REAR_LEFT", "LEFT"]
const result = (id: string, label: string, state: MediaQualityRuleResult["state"], score: number, description: string, affectedItemIds: readonly string[] = []): MediaQualityRuleResult => ({ id, label, state, score, description, affectedItemIds })

function estimatedAngles(count: number) {
  if (!count) return []
  return ANGLES.filter((_, index) => Math.floor(index * count / ANGLES.length) < count)
}

export class MediaQualityEngine {
  analyze(items: readonly MediaQualityItem[], mode: "360" | "GALLERY" = "GALLERY"): MediaQualityDeterministicAnalysis {
    const ready = items.filter((item) => item.ready)
    const lowResolution = ready.filter((item) => item.width !== null && item.height !== null && item.width * item.height < 1_000_000)
    const inaccessible = ready.filter((item) => !item.url)
    const formats = new Set(ready.map((item) => item.mimeType))
    const ratios = ready.flatMap((item) => item.width && item.height ? [item.width / item.height] : [])
    const exactHashes = ready.map((item) => item.hash).filter((hash): hash is string => Boolean(hash))
    const duplicateHashes = new Set(exactHashes.filter((hash, index) => exactHashes.indexOf(hash) !== index))
    const nearDuplicates = new Set<string>()
    const exposureIssues = ready.filter((item) => item.brightness !== undefined && item.brightness !== null && (item.brightness < 0.2 || item.brightness > 0.8))
    const histogramIssues = new Set<string>()
    ready.forEach((left, index) => ready.slice(index + 1).forEach((right) => {
      const distance = left.perceptualHash && right.perceptualHash ? hammingDistance(left.perceptualHash, right.perceptualHash) : null
      if (distance !== null && distance <= 3) { nearDuplicates.add(left.id); nearDuplicates.add(right.id) }
    }))
    ready.slice(1).forEach((current, index) => {
      const previous = ready[index]
      const distance = previous.histogram && current.histogram ? histogramDistance(previous.histogram, current.histogram) : null
      if (distance !== null && distance > 0.5) { histogramIssues.add(previous.id); histogramIssues.add(current.id) }
    })
    const positions = ready.map((item) => item.position).sort((a, b) => a - b)
    const continuous = positions.every((position, index) => index === 0 || position === positions[index - 1] + 1)
    const capturedAngles = mode === "360" ? estimatedAngles(ready.length) : []
    const missingAngles = mode === "360" ? ANGLES.filter((angle) => !capturedAngles.includes(angle)) : []
    const countState = mode === "360" && ready.length < 12 ? "BLOCKER" : ready.length < (mode === "360" ? 24 : 3) ? "WARNING" : "PASS"
    const rules = [
      result("count", "Couverture", countState, countState === "PASS" ? 100 : countState === "WARNING" ? 60 : 0, `${ready.length} média(s) prêt(s).`),
      result("access", "Accessibilité", inaccessible.length ? "BLOCKER" : "PASS", inaccessible.length ? 0 : 100, inaccessible.length ? "Certaines images sont inaccessibles." : "Toutes les images sont accessibles.", inaccessible.map((item) => item.id)),
      result("resolution", "Résolution", lowResolution.length ? "WARNING" : "PASS", lowResolution.length ? 60 : 100, lowResolution.length ? "Certaines images ont une résolution faible." : "La résolution est suffisante.", lowResolution.map((item) => item.id)),
      result("ratio", "Ratio", ratios.length > 1 && Math.max(...ratios) - Math.min(...ratios) > 0.2 ? "WARNING" : "PASS", ratios.length > 1 && Math.max(...ratios) - Math.min(...ratios) > 0.2 ? 60 : 100, "Cohérence des ratios contrôlée."),
      result("format", "Formats", formats.size > 2 ? "WARNING" : "PASS", formats.size > 2 ? 70 : 100, `${formats.size} format(s) utilisé(s).`),
      result("order", "Ordre", continuous ? "PASS" : "BLOCKER", continuous ? 100 : 0, continuous ? "L’ordre est continu." : "Des positions sont manquantes."),
      result("exact-duplicates", "Doublons exacts", duplicateHashes.size ? "WARNING" : "PASS", duplicateHashes.size ? 50 : 100, duplicateHashes.size ? "Des doublons exacts ont été détectés." : "Aucun doublon exact détecté."),
      result("near-duplicates", "Doublons visuels", nearDuplicates.size ? "WARNING" : "PASS", nearDuplicates.size ? 65 : 100, nearDuplicates.size ? "Des images quasi identiques sont présentes." : "Aucun doublon visuel détecté.", [...nearDuplicates]),
      result("variants", "Variantes média", ready.some((item) => item.variantNames && !item.variantNames.includes("mobile")) ? "WARNING" : "PASS", ready.some((item) => item.variantNames && !item.variantNames.includes("mobile")) ? 70 : 100, "Les variantes disponibles ont été contrôlées."),
      result("exif", "Métadonnées EXIF", ready.some((item) => item.hasExif === false) ? "WARNING" : "PASS", ready.some((item) => item.hasExif === false) ? 80 : 100, "La disponibilité EXIF a été contrôlée."),
      result("exposure", "Luminosité", exposureIssues.length ? "WARNING" : "PASS", exposureIssues.length ? 60 : 100, exposureIssues.length ? "Certaines images semblent sous-exposées ou surexposées." : "La luminosité moyenne est exploitable.", exposureIssues.map((item) => item.id)),
      result("histogram", "Cohérence lumineuse", histogramIssues.size ? "WARNING" : "PASS", histogramIssues.size ? 60 : 100, histogramIssues.size ? "La luminosité varie fortement entre plusieurs vues." : "Les histogrammes disponibles sont cohérents.", [...histogramIssues]),
    ] as const
    const average = (ids: readonly string[]) => Math.round(rules.filter((item) => ids.includes(item.id)).reduce((sum, item) => sum + item.score, 0) / ids.length)
    const coverageScore = average(["count", "order", "access"])
    const technicalScore = average(["resolution", "format", "exif", "exposure"])
    const consistencyScore = average(["ratio", "exact-duplicates", "near-duplicates", "variants", "histogram"])
    const score = Math.round(coverageScore * 0.5 + technicalScore * 0.25 + consistencyScore * 0.25)
    return { coverageScore, technicalScore, consistencyScore, score, rules, blockers: rules.filter((item) => item.state === "BLOCKER"), warnings: rules.filter((item) => item.state === "WARNING"), strengths: rules.filter((item) => item.state === "PASS").map((item) => item.description), weaknesses: rules.filter((item) => item.state !== "PASS").map((item) => item.description), capturedAngles, missingAngles }
  }
}
