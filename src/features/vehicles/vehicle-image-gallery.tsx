import { Star, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  deleteVehicleImage,
  setVehiclePrimaryImage,
} from "./image-actions"
import { VehicleImageCategorySelect } from "./components/vehicle-image-category-select"
import type { VehicleImageCategory } from "./image-category"

type VehicleImage = {
  id: string
  url: string | null
  type: VehicleImageCategory
  is_primary: boolean
}

type VehicleImageGalleryProps = {
  images: VehicleImage[]
  vehicleName: string
}

export function VehicleImageGallery({
  images,
  vehicleName,
}: VehicleImageGalleryProps) {
  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-zinc-50 p-10 text-center">
        <p className="font-medium">Aucune photo enregistrée</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La première image importée deviendra automatiquement la photo
          principale.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {images.map((image) =>
        image.url ? (
          <article
            key={image.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-zinc-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`Photo de ${vehicleName}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
              <div className="flex flex-wrap items-center gap-2">
                <VehicleImageCategorySelect imageId={image.id} category={image.type} />
                {image.is_primary && <Badge>Principale</Badge>}
              </div>

              <div className="flex shrink-0 gap-2">
                {!image.is_primary && (
                  <form action={setVehiclePrimaryImage}>
                    <input type="hidden" name="imageId" value={image.id} />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="icon-sm"
                      aria-label="Définir comme photo principale"
                      title="Définir comme photo principale"
                    >
                      <Star />
                    </Button>
                  </form>
                )}

                <form action={deleteVehicleImage}>
                  <input type="hidden" name="imageId" value={image.id} />
                  <Button
                    type="submit"
                    variant="destructive"
                    size="icon-sm"
                    className="bg-white/95"
                    aria-label="Supprimer la photo"
                    title="Supprimer la photo"
                  >
                    <Trash2 />
                  </Button>
                </form>
              </div>
            </div>
          </article>
        ) : null
      )}
    </div>
  )
}
