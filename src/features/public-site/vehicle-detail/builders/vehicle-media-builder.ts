import {
  VehicleAssetGalleryBuilder,
  buildAssetGalleryViewModel,
  mapVehicleImageAsset,
  type Asset,
  type VehicleAssetGallery,
} from "@/features/media"
import type { LiveStockVehicle } from "@/features/live-stock"
import { resolveVehicleImagePublicUrl } from "@/features/vehicles/vehicle-image-presentation"

function fallbackAsset(vehicle: LiveStockVehicle): Asset {
  return {
    id: `${vehicle.id}:fallback`,
    garageId: vehicle.garageId,
    vehicleId: vehicle.id,
    type: "IMAGE",
    status: "READY",
    visibility: "PUBLIC",
    storageBucket: null,
    storagePath: null,
    sourceUrl: null,
    variants: [],
    metadata: { alt: `${vehicle.make} ${vehicle.model}` },
    processing: {
      status: "READY", progress: 100, operation: null, errorCode: null,
      errorMessage: null, startedAt: null, completedAt: null,
    },
    position: 0,
    manualOrder: 0,
    isCover: true,
    isFeatured: false,
    collectionIds: [],
  }
}

export function buildVehicleMedia(vehicle: LiveStockVehicle): {
  readonly domain: VehicleAssetGallery
  readonly view: ReturnType<typeof buildAssetGalleryViewModel>
} {
  const assets = vehicle.photos.flatMap((photo, index) => {
    const publicUrl = resolveVehicleImagePublicUrl({
      url: photo.url,
      storagePath: photo.path,
      garageId: vehicle.garageId,
      vehicleId: vehicle.id,
    })
    if (!publicUrl) return []
    const asset = mapVehicleImageAsset({
      id: photo.id,
      garageId: vehicle.garageId,
      vehicleId: vehicle.id,
      storagePath: photo.path,
      publicUrl,
      createdAt: vehicle.updatedAt,
      isPrimary: photo.isCover,
      position: photo.position,
    })
    return [{
      ...asset,
      metadata: {
        ...asset.metadata,
        width: vehicle.photos[index].width ?? undefined,
        height: vehicle.photos[index].height ?? undefined,
        alt: vehicle.photos[index].alt,
      },
    }]
  })
  const domain = new VehicleAssetGalleryBuilder().build({
    vehicleId: vehicle.id,
    assets,
    fallbackCover: fallbackAsset(vehicle),
  })
  return { domain, view: buildAssetGalleryViewModel(domain) }
}
