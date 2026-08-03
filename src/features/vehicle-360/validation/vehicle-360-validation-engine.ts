import type { Vehicle360CoverageRule, Vehicle360CoverageViewModel, Vehicle360Sequence } from "../types"
import { Vehicle360SequenceEngine } from "../engine/vehicle-360-sequence-engine"

const rule = (id: string, label: string, state: Vehicle360CoverageRule["state"], description: string): Vehicle360CoverageRule => ({ id, label, state, description })

export class Vehicle360ValidationEngine {
  validate(sequence: Vehicle360Sequence): Vehicle360CoverageViewModel {
    const ready = new Vehicle360SequenceEngine().order(sequence.frames.filter((frame) => frame.status === "READY"))
    const positions = ready.map((frame) => frame.position)
    const duplicates = new Set(positions).size !== positions.length
    const continuous = positions.every((position, index) => index === 0 || position === positions[index - 1] + 1)
    const ratios = ready.flatMap((frame) => frame.width && frame.height ? [frame.width / frame.height] : [])
    const mixedRatio = ratios.length > 1 && Math.max(...ratios) - Math.min(...ratios) > 0.2
    const totalSize = ready.reduce((sum, frame) => sum + (frame.fileSize ?? 0), 0)
    const startValid = sequence.startFrameIndex !== null && sequence.startFrameIndex >= 0 && sequence.startFrameIndex < ready.length
    const rules = [
      ready.length < 12 ? rule("minimum", "Nombre minimum", "BLOCKER", "Au moins 12 images prêtes sont nécessaires.")
        : ready.length < 24 ? rule("minimum", "Nombre d’images", "WARNING", "24 à 36 images sont recommandées.")
        : ready.length > 48 ? rule("minimum", "Nombre d’images", "WARNING", "La séquence dépasse 48 images.")
        : rule("minimum", "Nombre d’images", "PASS", "Le nombre d’images recommandé est atteint."),
      ready.some((frame) => !frame.publicUrl) ? rule("accessible", "Images accessibles", "BLOCKER", "Une image est inaccessible.") : rule("accessible", "Images accessibles", "PASS", "Toutes les images sont accessibles."),
      duplicates ? rule("positions", "Positions uniques", "BLOCKER", "Des positions sont dupliquées.") : rule("positions", "Positions uniques", "PASS", "Les positions sont uniques."),
      continuous ? rule("order", "Ordre continu", "PASS", "L’ordre de la séquence est continu.") : rule("order", "Ordre continu", "BLOCKER", "La séquence contient un trou dans l’ordre."),
      mixedRatio ? rule("ratio", "Format cohérent", "WARNING", "Les ratios d’image sont hétérogènes.") : rule("ratio", "Format cohérent", "PASS", "Les formats sont cohérents."),
      totalSize > 300 * 1024 * 1024 ? rule("weight", "Poids total", "WARNING", "Le poids total dépasse 300 Mo.") : rule("weight", "Poids total", "PASS", "Le poids total est raisonnable."),
      startValid ? rule("start", "Image de départ", "PASS", "L’image de départ est définie.") : rule("start", "Image de départ", "WARNING", "Définissez explicitement l’image de départ."),
    ] as const
    const blockers = rules.filter((item) => item.state === "BLOCKER")
    const warnings = rules.filter((item) => item.state === "WARNING")
    const score = Math.max(0, Math.round(100 * rules.filter((item) => item.state === "PASS").length / rules.length - blockers.length * 10))
    return { score, ready: blockers.length === 0, blockers, warnings, rules, summary: blockers.length ? `${blockers.length} blocage(s)` : warnings.length ? `${warnings.length} avertissement(s)` : "Séquence prête" }
  }
}
