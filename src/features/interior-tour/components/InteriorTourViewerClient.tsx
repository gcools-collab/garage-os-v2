"use client"

import { Maximize2, RotateCcw, X } from "lucide-react"
import { useMemo, useState } from "react"

import type { InteriorTourViewerViewModel } from "../types"
import { InteriorPanoramaViewer } from "./InteriorPanoramaViewer"

export function nextInteriorScene(currentId: string, delta: number, ids: readonly string[]) {
  const index = ids.indexOf(currentId)
  return ids.length ? ids[(Math.max(0, index) + delta + ids.length) % ids.length] : currentId
}

export function InteriorTourViewerClient({
  viewer,
  fallbackHref = "#vehicle-gallery",
}: {
  readonly viewer: InteriorTourViewerViewModel
  readonly fallbackHref?: string
}) {
  const [sceneId, setSceneId] = useState(viewer.startSceneId)
  const [fullscreen, setFullscreen] = useState(false)
  const scene = viewer.scenes.find((item) => item.id === sceneId) ?? viewer.scenes[0]

  const select = (id: string) => {
    const target = viewer.scenes.find((item) => item.id === id)
    if (!target) return
    setSceneId(id)
  }

  const hotspotById = useMemo(
    () => new Map(scene.hotspots.map((hotspot) => [hotspot.id, hotspot])),
    [scene.hotspots],
  )

  return (
    <section
      aria-label={viewer.label}
      tabIndex={0}
      className={fullscreen ? "fixed inset-0 z-50 bg-[var(--live-background)] p-3" : "relative"}
    >
      <p className="sr-only">{viewer.instructions}</p>
      <InteriorPanoramaViewer
        panoramaUrl={scene.image.source.url}
        caption={scene.name}
        initialYaw={scene.initialYaw}
        initialPitch={scene.initialPitch}
        hotspots={scene.hotspots.map((hotspot) => ({
          id: hotspot.id,
          label: hotspot.label,
          yaw: hotspot.yaw,
          pitch: hotspot.pitch,
        }))}
        onHotspotSelect={(hotspotId) => {
          const hotspot = hotspotById.get(hotspotId)
          if (hotspot) select(hotspot.targetSceneId)
        }}
        className={fullscreen ? "h-[calc(100vh-7rem)] w-full" : "h-72 w-full sm:h-96 md:h-[28rem]"}
      />
      <ul className="sr-only" aria-label="Liens de navigation dans le panorama">
        {scene.hotspots.map((hotspot) => (
          <li key={hotspot.id}>{hotspot.label} — {hotspot.targetSceneName}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--live-border)] bg-[var(--live-surface)] p-3">
        <strong className="mr-auto truncate">{scene.name}</strong>
        <button
          type="button"
          onClick={() => select(scene.id)}
          aria-label={viewer.resetLabel}
          className="min-h-11 min-w-11 rounded-md p-2 focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]"
        >
          <RotateCcw aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setFullscreen((value) => !value)}
          aria-label={fullscreen ? "Fermer le plein écran" : viewer.fullscreenLabel}
          className="min-h-11 min-w-11 rounded-md p-2 focus-visible:outline-2 focus-visible:outline-[var(--live-focus-ring)]"
        >
          {fullscreen ? <X aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 p-3">
        {viewer.scenes.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === scene.id}
            onClick={() => select(item.id)}
            className="min-h-11 rounded-lg border border-[var(--live-border)] px-3 py-2 text-sm aria-pressed:bg-[var(--live-primary)] aria-pressed:text-[var(--live-primary-foreground)]"
          >
            {item.name}
          </button>
        ))}
        <a href={fallbackHref} className="ml-auto min-h-11 rounded-lg px-3 py-2 text-sm underline">
          {viewer.fallbackLabel}
        </a>
      </div>
    </section>
  )
}
