"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useState, type KeyboardEvent } from "react"
import type { VehicleImage } from "../../types"
import { getNextImageIndex, getPreviousImageIndex } from "./gallery-navigation"

export function VehicleGalleryClient({
  images,
  displayName,
}: {
  images: VehicleImage[]
  displayName: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex] ?? images[0]
  const hasNavigation = images.length > 1

  const goPrevious = () =>
    setActiveIndex((current) => getPreviousImageIndex(current, images.length))
  const goNext = () =>
    setActiveIndex((current) => getNextImageIndex(current, images.length))
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      goPrevious()
    }
    if (event.key === "ArrowRight") {
      event.preventDefault()
      goNext()
    }
  }

  return (
    <section
      aria-label={`Galerie de ${displayName}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="space-y-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-muted)]">
        <Image
          key={activeImage.id}
          src={activeImage.url}
          alt={activeImage.alt || displayName}
          fill
          preload={activeIndex === 0}
          sizes="(max-width: 1023px) calc(100vw - 2.5rem), (max-width: 1536px) 64vw, 850px"
          className="object-cover"
        />
        <span className="absolute right-4 top-4 rounded-full bg-[var(--live-background)] px-3 py-1 text-xs font-medium text-[var(--live-foreground)]">
          {activeIndex + 1} / {images.length}
        </span>
        {hasNavigation && (
          <>
            <button
              type="button"
              onClick={goPrevious}
              aria-label="Afficher l’image précédente"
              className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--live-border)] bg-[var(--live-background)] text-[var(--live-foreground)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-primary)] motion-reduce:transition-none"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Afficher l’image suivante"
              className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--live-border)] bg-[var(--live-background)] text-[var(--live-foreground)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-primary)] motion-reduce:transition-none"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </>
        )}
      </div>

      {hasNavigation && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Afficher l’image ${index + 1} de ${displayName}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className="relative aspect-[4/3] overflow-hidden rounded-[var(--live-control-radius)] border border-[var(--live-border)] bg-[var(--live-muted)] transition hover:border-[var(--live-primary)] aria-current:border-[var(--live-primary)] aria-current:ring-2 aria-current:ring-[var(--live-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live-primary)] motion-reduce:transition-none"
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="(max-width: 639px) calc(25vw - 1.5rem), 170px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
