"use client"

import { ChevronLeft, ChevronRight, Loader2, Star, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  deleteVehicleImage,
  reorderVehicleImage,
  setVehiclePrimaryImage,
} from "../image-actions"
import { VehicleImageCategorySelect } from "./vehicle-image-category-select"
import type { VehicleImageCategory } from "../image-category"

type VehicleImage = {
  readonly id: string
  readonly url: string | null
  readonly type: VehicleImageCategory
  readonly is_primary: boolean
  readonly display_order?: number
}

type VehicleImageGalleryClientProps = {
  readonly images: readonly VehicleImage[]
  readonly vehicleId: string
  readonly vehicleName: string
}

export function VehicleImageGalleryClient({
  images,
  vehicleId,
  vehicleName,
}: VehicleImageGalleryClientProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-zinc-50 p-8 text-center sm:p-10">
        <p className="font-medium">Aucune photo</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La première photo importée devient la photo principale.
        </p>
      </div>
    )
  }

  const sorted = [...images].sort((first, second) => {
    if (first.is_primary !== second.is_primary) return first.is_primary ? -1 : 1
    return (first.display_order ?? 0) - (second.display_order ?? 0)
  })

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action()
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {pending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Mise à jour en cours…
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {sorted.map((image, index) =>
          image.url ? (
            <article
              key={image.id}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-zinc-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={`Photo ${index + 1} — ${vehicleName}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent p-2">
                <span className="rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white">
                  {index + 1}
                </span>
                {image.is_primary ? <Badge className="shrink-0">Principale</Badge> : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8">
                <VehicleImageCategorySelect imageId={image.id} category={image.type} />
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    disabled={pending || index === 0}
                    aria-label="Déplacer vers la gauche"
                    onClick={() => run(() => reorderVehicleImage(vehicleId, image.id, -1))}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    disabled={pending || index === sorted.length - 1}
                    aria-label="Déplacer vers la droite"
                    onClick={() => run(() => reorderVehicleImage(vehicleId, image.id, 1))}
                  >
                    <ChevronRight />
                  </Button>
                  {!image.is_primary ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      disabled={pending}
                      aria-label="Définir comme photo principale"
                      onClick={() =>
                        run(async () => {
                          const formData = new FormData()
                          formData.set("imageId", image.id)
                          await setVehiclePrimaryImage(formData)
                        })
                      }
                    >
                      <Star />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    disabled={pending}
                    aria-label="Supprimer la photo"
                    onClick={() =>
                      run(async () => {
                        const formData = new FormData()
                        formData.set("imageId", image.id)
                        await deleteVehicleImage(formData)
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </article>
          ) : null,
        )}
      </div>
    </div>
  )
}
