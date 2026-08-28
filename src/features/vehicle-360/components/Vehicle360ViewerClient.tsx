"use client"

import { ChevronLeft, ChevronRight, Maximize2, RotateCcw, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { AssetImage } from "@/features/media"
import type { Vehicle360ViewerViewModel } from "../types"

export function nextCircularFrame(index: number, delta: number, length: number) {
  return length ? (index + delta + length) % length : 0
}

export function Vehicle360ViewerClient({ viewer }: { readonly viewer: Vehicle360ViewerViewModel }) {
  const [index, setIndex] = useState(viewer.startIndex)
  const [fullscreen, setFullscreen] = useState(false)
  const startX = useRef<number | null>(null)
  const prefersReducedMotion = useRef(false)
  const frame = viewer.frames[index]
  const move = (delta: number) => setIndex((current) => nextCircularFrame(current, delta, viewer.frames.length))

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  useEffect(() => {
    for (const offset of [1, -1, 2, -2]) {
      const target = viewer.frames[nextCircularFrame(index, offset, viewer.frames.length)]
      const url = target?.image.source.url
      if (!url) continue
      const image = new window.Image()
      image.src = url
    }
  }, [index, viewer.frames])

  return (
    <section
      aria-label={viewer.label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") move(-1)
        if (event.key === "ArrowRight") move(1)
        if (event.key === "Escape") setFullscreen(false)
      }}
      onPointerDown={(event) => {
        startX.current = event.clientX
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={(event) => {
        if (startX.current !== null && Math.abs(event.clientX - startX.current) >= 32) {
          move(event.clientX < startX.current ? 1 : -1)
        }
        startX.current = null
      }}
      className={fullscreen ? "fixed inset-0 z-50 grid place-items-center bg-black/95 p-4" : "relative overflow-hidden rounded-2xl border bg-muted/20"}
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
    >
      <p className="sr-only">{viewer.instructions}</p>
      <div className={fullscreen ? "relative aspect-[4/3] w-full max-w-6xl" : "relative aspect-[4/3] w-full"}>
        <AssetImage
          image={frame.image}
          sizes={fullscreen ? "100vw" : "(max-width: 1024px) 100vw, 900px"}
        />
      </div>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl bg-background/90 p-2 backdrop-blur">
        <button type="button" aria-label={viewer.previousLabel} onClick={() => move(-1)} className="min-h-11 min-w-11 rounded-md p-2 focus-visible:outline-2">
          <ChevronLeft />
        </button>
        <span aria-live="polite" className="text-sm tabular-nums">{index + 1} / {viewer.frames.length}</span>
        <div className="flex gap-1">
          <button type="button" aria-label={viewer.resetLabel} onClick={() => setIndex(viewer.startIndex)} className="min-h-11 min-w-11 rounded-md p-2 focus-visible:outline-2">
            <RotateCcw />
          </button>
          <button type="button" aria-label={fullscreen ? "Fermer le plein écran" : viewer.fullscreenLabel} onClick={() => setFullscreen((value) => !value)} className="min-h-11 min-w-11 rounded-md p-2 focus-visible:outline-2">
            {fullscreen ? <X /> : <Maximize2 />}
          </button>
          <button type="button" aria-label={viewer.nextLabel} onClick={() => move(1)} className="min-h-11 min-w-11 rounded-md p-2 focus-visible:outline-2">
            <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  )
}
