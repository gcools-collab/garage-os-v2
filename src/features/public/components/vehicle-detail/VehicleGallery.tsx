import { CarFront } from "lucide-react"
import type { VehicleImage } from "../../types"
import { VehicleGalleryClient } from "./VehicleGalleryClient"

export function VehicleGallery({
  images,
  displayName,
}: {
  images: VehicleImage[]
  displayName: string
}) {
  if (images.length === 0) {
    return (
      <section
        aria-label="Galerie du véhicule"
        className="flex aspect-[16/10] items-center justify-center rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)]"
      >
        <div className="text-center text-[var(--live-muted-foreground)]">
          <CarFront aria-hidden="true" className="mx-auto size-14" />
          <p className="mt-3 text-sm">Visuel bientôt disponible</p>
        </div>
      </section>
    )
  }

  return <VehicleGalleryClient images={images} displayName={displayName} />
}
