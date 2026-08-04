import { InteriorHotspotEngine, InteriorTourEngine } from "../engine"
import type { InteriorTour, InteriorTourRule, InteriorTourValidation } from "../types"

const rule = (id: string, label: string, state: InteriorTourRule["state"], description: string, affectedSceneIds: readonly string[] = []): InteriorTourRule => ({ id, label, state, description, affectedSceneIds })
export class InteriorTourValidationEngine {
  validate(tour: InteriorTour): InteriorTourValidation {
    const scenes = new InteriorTourEngine().order(tour.scenes.filter((scene) => scene.status === "READY"))
    const sceneIds = new Set(scenes.map((scene) => scene.id))
    const inaccessible = scenes.filter((scene) => !scene.publicUrl).map((scene) => scene.id)
    const wrongRatio = scenes.filter((scene) => scene.width && scene.height && Math.abs(scene.width / scene.height - 2) > 0.15).map((scene) => scene.id)
    const lowResolution = scenes.filter((scene) => scene.width && scene.height && (scene.width < 3000 || scene.height < 1500)).map((scene) => scene.id)
    const unnamed = scenes.filter((scene) => !scene.name.trim()).map((scene) => scene.id)
    const heavy = scenes.filter((scene) => (scene.fileSize ?? 0) > 12 * 1024 * 1024).map((scene) => scene.id)
    const cameraMissing = scenes.filter((scene) => scene.initialYaw === null || scene.initialPitch === null || scene.initialFov === null).map((scene) => scene.id)
    const invalidHotspots = tour.hotspots.filter((hotspot) => !new InteriorHotspotEngine().validate(hotspot, scenes)).map((hotspot) => hotspot.id)
    const rules = [
      scenes.length ? rule("scenes", "Panoramas prêts", "PASS", `${scenes.length} panorama(s) prêt(s).`) : rule("scenes", "Panoramas prêts", "BLOCKER", "Ajoutez au moins un panorama prêt."),
      inaccessible.length ? rule("access", "Images accessibles", "BLOCKER", "Un panorama est inaccessible.", inaccessible) : rule("access", "Images accessibles", "PASS", "Tous les panoramas sont accessibles."),
      tour.startSceneId && sceneIds.has(tour.startSceneId) ? rule("start", "Scène de départ", "PASS", "La scène de départ est valide.") : rule("start", "Scène de départ", "BLOCKER", "Définissez une scène de départ valide."),
      invalidHotspots.length ? rule("hotspots", "Hotspots", "BLOCKER", "Un hotspot cible une scène invalide.") : scenes.length > 1 && !tour.hotspots.length ? rule("hotspots", "Hotspots", "WARNING", "Reliez les scènes avec au moins un hotspot.") : rule("hotspots", "Hotspots", "PASS", "Les hotspots sont cohérents."),
      wrongRatio.length ? rule("ratio", "Format panoramique", "WARNING", "Le ratio 2:1 est recommandé.", wrongRatio) : rule("ratio", "Format panoramique", "PASS", "Le ratio panoramique est cohérent."),
      lowResolution.length ? rule("resolution", "Résolution", "WARNING", "Une résolution de 3000 × 1500 minimum est recommandée.", lowResolution) : rule("resolution", "Résolution", "PASS", "La résolution est suffisante."),
      unnamed.length ? rule("names", "Nom des scènes", "WARNING", "Nommez toutes les scènes.", unnamed) : rule("names", "Nom des scènes", "PASS", "Toutes les scènes sont nommées."),
      heavy.length ? rule("weight", "Poids", "WARNING", "Certains panoramas dépassent 12 Mo.", heavy) : rule("weight", "Poids", "PASS", "Le poids des panoramas est raisonnable."),
      cameraMissing.length ? rule("camera", "Vue initiale", "WARNING", "Réglez la vue initiale de chaque scène.", cameraMissing) : rule("camera", "Vue initiale", "PASS", "Les vues initiales sont définies."),
    ] as const
    const blockers = rules.filter((item) => item.state === "BLOCKER")
    const warnings = rules.filter((item) => item.state === "WARNING")
    const applicable = rules.length
    const score = Math.round(rules.reduce((sum, item) => sum + (item.state === "PASS" ? 100 : item.state === "WARNING" ? 50 : 0), 0) / applicable)
    return { score, ready: blockers.length === 0, rules, blockers, warnings, summary: blockers.length ? `${blockers.length} blocage(s)` : warnings.length ? `${warnings.length} avertissement(s)` : "Visite prête" }
  }
}
