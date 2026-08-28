"use client"

import { useEffect, useRef, useState } from "react"

import type { PanoramaHotspotMarker } from "./InteriorPanoramaViewer.types"

export type { PanoramaHotspotMarker }

type InteriorPanoramaViewerProps = Readonly<{
  readonly panoramaUrl: string
  readonly caption: string
  readonly initialYaw?: number
  readonly initialPitch?: number
  readonly hotspots?: readonly PanoramaHotspotMarker[]
  readonly onHotspotSelect?: (hotspotId: string) => void
  readonly className?: string
}>

export function InteriorPanoramaViewer(props: InteriorPanoramaViewerProps) {
  return <InteriorPanoramaViewerInner key={props.panoramaUrl} {...props} />
}

function InteriorPanoramaViewerInner({
  panoramaUrl,
  caption,
  initialYaw = 0,
  initialPitch = 0,
  hotspots = [],
  onHotspotSelect,
  className,
}: InteriorPanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hotspotHandlerRef = useRef(onHotspotSelect)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    hotspotHandlerRef.current = onHotspotSelect
  }, [onHotspotSelect])

  useEffect(() => {
    let cancelled = false
    let destroy: (() => void) | null = null

    async function mount() {
      try {
        const [{ Viewer }, { MarkersPlugin }] = await Promise.all([
          import("@photo-sphere-viewer/core"),
          import("@photo-sphere-viewer/markers-plugin"),
        ])
        await import("@photo-sphere-viewer/core/index.css")
        if (cancelled || !containerRef.current) return

        const viewer = new Viewer({
          container: containerRef.current,
          panorama: panoramaUrl,
          caption,
          defaultYaw: `${initialYaw}deg`,
          defaultPitch: `${initialPitch}deg`,
          navbar: ["zoom", "move", "fullscreen"],
          touchmoveTwoFingers: false,
          mousewheelCtrlKey: false,
          plugins: [
            MarkersPlugin.withConfig({
              markers: hotspots.map((hotspot) => ({
                id: hotspot.id,
                position: { yaw: `${hotspot.yaw}deg`, pitch: `${hotspot.pitch}deg` },
                html: `<span class="rounded-full border border-white/80 bg-black/75 px-3 py-1.5 text-xs font-medium text-white shadow-lg">${hotspot.label}</span>`,
                anchor: "center center",
                data: { hotspotId: hotspot.id },
              })),
            }),
          ],
        })

        viewer.addEventListener("ready", () => {
          if (!cancelled) setLoading(false)
        })

        viewer.addEventListener("panorama-error", () => {
          if (!cancelled) setFailed(true)
        })

        const markers = viewer.getPlugin(MarkersPlugin)
        markers?.addEventListener("select-marker", (event: { marker?: { data?: { hotspotId?: string } } }) => {
          const hotspotId = event.marker?.data?.hotspotId
          if (hotspotId) hotspotHandlerRef.current?.(hotspotId)
        })

        destroy = () => viewer.destroy()
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void mount()

    return () => {
      cancelled = true
      destroy?.()
    }
  }, [panoramaUrl, caption, initialYaw, initialPitch, hotspots])

  if (failed) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Panorama indisponible ou image invalide.
      </p>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {loading ? (
        <span className="absolute left-3 top-3 z-10 rounded-lg bg-background/90 px-3 py-2 text-sm shadow">
          Chargement du panorama…
        </span>
      ) : null}
      <div
        ref={containerRef}
        className={className ?? "h-72 w-full touch-none sm:h-96 md:h-[28rem]"}
        style={{ touchAction: "none" }}
      />
    </div>
  )
}
