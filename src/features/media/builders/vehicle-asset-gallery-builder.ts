import type { Asset, VehicleAssetGallery } from "../types"

function orderValue(value: number | null) {
  return value ?? Number.MAX_SAFE_INTEGER
}

export function sortAssets(assets: readonly Asset[]): readonly Asset[] {
  return [...assets].sort((left, right) =>
    orderValue(left.manualOrder) - orderValue(right.manualOrder)
    || orderValue(left.position) - orderValue(right.position)
    || (left.metadata.createdAt ?? "").localeCompare(right.metadata.createdAt ?? "")
    || left.id.localeCompare(right.id)
  )
}

export class VehicleAssetGalleryBuilder {
  build(input: {
    readonly vehicleId: string
    readonly assets: readonly Asset[]
    readonly fallbackCover?: Asset
  }): VehicleAssetGallery {
    const eligible = input.assets.filter((asset) =>
      asset.vehicleId === input.vehicleId
      && asset.status !== "ARCHIVED"
    )
    const orderedAssets = sortAssets(eligible)
    const cover = orderedAssets.find((asset) => asset.isCover)
      ?? orderedAssets[0]
      ?? input.fallbackCover
    if (!cover) throw new Error("Vehicle asset gallery requires a cover asset")
    return {
      vehicleId: input.vehicleId,
      cover,
      gallery: orderedAssets,
      featured: orderedAssets.filter((asset) => asset.isFeatured),
      orderedAssets,
    }
  }
}
