import { CarFront } from "lucide-react"
import Image from "next/image"
import type { LiveVehicleDetail } from "../../types"

export function VehicleGallery({
  detail,
}: {
  detail: LiveVehicleDetail
}) {
  if (!detail.primaryImage) {
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

  const secondaryImages = detail.images.slice(1, 5)

  return (
    <section aria-label="Galerie du véhicule" className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-muted)]">
        <Image
          src={detail.primaryImage.url}
          alt={detail.primaryImage.alt}
          fill
          preload
          sizes="(max-width: 1023px) calc(100vw - 2.5rem), (max-width: 1536px) 64vw, 850px"
          className="object-cover"
        />
      </div>
      {secondaryImages.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {secondaryImages.map((image) => (
            <div
              key={image.id}
              className="relative aspect-[4/3] overflow-hidden rounded-[var(--live-control-radius)] border border-[var(--live-border)] bg-[var(--live-muted)]"
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(max-width: 639px) calc(50vw - 1.75rem), (max-width: 1023px) calc(25vw - 1.5rem), 210px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
