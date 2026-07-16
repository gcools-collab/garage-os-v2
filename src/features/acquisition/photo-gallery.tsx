"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

export function AcquisitionPhotoGallery({
  photos,
  title,
}: {
  photos: string[]
  title: string
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedPhoto = photos[selectedIndex]

  if (!selectedPhoto) {
    return (
      <div className="flex aspect-[16/7] items-center justify-center rounded-t-xl bg-muted text-sm text-muted-foreground">
        Aucune photo disponible
      </div>
    )
  }

  return (
    <div className="space-y-3 bg-zinc-950 p-3 sm:p-4">
      <div className="relative">
        <div
          role="img"
          aria-label={`${title}, photo ${selectedIndex + 1}`}
          className="aspect-[16/8] rounded-lg bg-zinc-900 bg-contain bg-center bg-no-repeat sm:aspect-[16/7]"
          style={{ backgroundImage: `url(${JSON.stringify(selectedPhoto)})` }}
        />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
          {selectedIndex + 1} / {photos.length}
        </span>
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Photos de l'annonce">
          {photos.map((photo, index) => (
            <Button
              key={photo}
              type="button"
              variant="ghost"
              aria-label={`Afficher la photo ${index + 1}`}
              aria-pressed={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              className={`h-16 w-24 shrink-0 rounded-md border-2 bg-zinc-900 bg-cover bg-center p-0 hover:bg-zinc-800 ${
                selectedIndex === index ? "border-white" : "border-transparent opacity-70"
              }`}
              style={{ backgroundImage: `url(${JSON.stringify(photo)})` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
