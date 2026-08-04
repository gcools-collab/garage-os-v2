import type { InteriorTourScene, InteriorTourStatus } from "../types"

const TRANSITIONS: Readonly<Record<InteriorTourStatus, readonly InteriorTourStatus[]>> = { DRAFT: ["READY", "FAILED", "ARCHIVED"], READY: ["DRAFT", "PUBLISHED", "FAILED", "ARCHIVED"], PUBLISHED: ["READY", "ARCHIVED"], FAILED: ["DRAFT", "ARCHIVED"], ARCHIVED: [] }
export class InteriorTourEngine {
  canTransition(from: InteriorTourStatus, to: InteriorTourStatus) { return TRANSITIONS[from].includes(to) }
  assertTransition(from: InteriorTourStatus, to: InteriorTourStatus) { if (!this.canTransition(from, to)) throw new Error(`Invalid interior tour transition: ${from} -> ${to}`) }
  order(scenes: readonly InteriorTourScene[]) { return [...scenes].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) }
  move(scenes: readonly InteriorTourScene[], sceneId: string, direction: -1 | 1) { const ordered = this.order(scenes); const index = ordered.findIndex((scene) => scene.id === sceneId); const target = index + direction; if (index < 0 || target < 0 || target >= ordered.length) return ordered; const result = [...ordered]; [result[index], result[target]] = [result[target], result[index]]; return result.map((scene, position) => ({ ...scene, position: position + 1 })) }
}
