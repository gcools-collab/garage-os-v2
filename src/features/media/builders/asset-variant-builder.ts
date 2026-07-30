import type { Asset, AssetVariant } from "../types"

export const RESPONSIVE_VARIANT_PREFERENCES = {
  thumbnail: ["thumbnail", "small", "mobile", "original"],
  mobile: ["mobile", "small", "medium", "webp", "original"],
  desktop: ["large", "desktop", "medium", "webp", "original"],
  retina: ["retina", "large", "future-avif", "webp", "original"],
} as const

export type ResponsiveAssetTarget = keyof typeof RESPONSIVE_VARIANT_PREFERENCES

export function resolveAssetVariant(
  asset: Asset,
  target: ResponsiveAssetTarget
): AssetVariant | null {
  const variants = new Map(asset.variants.map((variant) => [variant.name, variant]))
  for (const name of RESPONSIVE_VARIANT_PREFERENCES[target]) {
    const variant = variants.get(name)
    if (variant?.url) return variant
  }
  if (!asset.sourceUrl || !asset.storagePath) return null
  return {
    id: `${asset.id}:source`,
    name: "source",
    storagePath: asset.storagePath,
    url: asset.sourceUrl,
    width: asset.metadata.width,
    height: asset.metadata.height,
  }
}
