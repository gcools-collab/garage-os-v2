"use client"

import { ChevronLeft, ChevronRight, Maximize2, Search, X } from "lucide-react"
import { useState } from "react"
import { AssetImage, AssetPlaceholder, type AssetGalleryViewModel, type AssetPlaceholderViewModel } from "@/features/media"

export function PremiumAssetGallery({ gallery }: { readonly gallery: AssetGalleryViewModel | AssetPlaceholderViewModel }) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [zoom, setZoom] = useState(false)
  if (gallery.empty) return <AssetPlaceholder placeholder={gallery} />
  const current = gallery.assets[index] ?? gallery.cover
  const move = (delta: number) => setIndex((value) => (value + delta + gallery.assets.length) % gallery.assets.length)
  return <section aria-label="Galerie immersive" onKeyDown={(event) => { if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); if (event.key === "Escape") setFullscreen(false) }} tabIndex={0} className={fullscreen ? "fixed inset-0 z-50 grid place-items-center bg-[var(--live-overlay)] p-4" : "space-y-3"}>
    <div className={`relative overflow-hidden rounded-2xl bg-[var(--live-surface-muted)] ${fullscreen ? "aspect-[16/10] w-full max-w-7xl" : "aspect-[16/10]"}`}><div className={`size-full transition-transform duration-300 motion-reduce:transition-none ${zoom ? "scale-125" : "scale-100"}`}><AssetImage image={current} priority={index === 0} sizes={fullscreen ? "100vw" : "(max-width: 1024px) 100vw, 75vw"} /></div><div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl bg-[var(--live-surface)]/90 p-2 backdrop-blur"><button type="button" aria-label="Photo précédente" onClick={() => move(-1)} className="rounded-lg p-2 focus-visible:outline-2"><ChevronLeft /></button><span aria-live="polite" className="text-sm tabular-nums">{index + 1} / {gallery.assets.length}</span><div className="flex gap-1"><button type="button" aria-label={zoom ? "Réduire l’image" : "Agrandir l’image"} aria-pressed={zoom} onClick={() => setZoom((value) => !value)} className="rounded-lg p-2 focus-visible:outline-2"><Search /></button><button type="button" aria-label={fullscreen ? "Fermer le plein écran" : "Afficher en plein écran"} onClick={() => setFullscreen((value) => !value)} className="rounded-lg p-2 focus-visible:outline-2">{fullscreen ? <X /> : <Maximize2 />}</button><button type="button" aria-label="Photo suivante" onClick={() => move(1)} className="rounded-lg p-2 focus-visible:outline-2"><ChevronRight /></button></div></div></div>
    {!fullscreen && gallery.assets.length > 1 ? <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">{gallery.assets.map((image, imageIndex) => <button type="button" key={image.id} aria-label={`Afficher la photo ${imageIndex + 1}`} aria-current={imageIndex === index ? "true" : undefined} onClick={() => setIndex(imageIndex)} className="aspect-square overflow-hidden rounded-lg border border-[var(--live-border)] aria-current:ring-2 aria-current:ring-[var(--live-focus-ring)]"><AssetImage image={image} sizes="8rem" /></button>)}</div> : null}
  </section>
}
