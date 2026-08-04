import type { InteriorTourHotspot, InteriorTourScene } from "../types"

export class InteriorHotspotEngine {
  validate(hotspot: InteriorTourHotspot, scenes: readonly InteriorTourScene[]) { const ids = new Set(scenes.map((scene) => scene.id)); return hotspot.sourceSceneId !== hotspot.targetSceneId && ids.has(hotspot.sourceSceneId) && ids.has(hotspot.targetSceneId) && hotspot.yaw >= -180 && hotspot.yaw <= 180 && hotspot.pitch >= -90 && hotspot.pitch <= 90 }
  project(yaw: number, pitch: number) { return { leftPercent: ((yaw + 180) / 360) * 100, topPercent: ((90 - pitch) / 180) * 100 } }
}
