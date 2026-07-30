import type {
  Asset,
  AssetGalleryViewModel,
  AssetImageViewModel,
  AssetPlaceholderViewModel,
  AssetSeoViewModel,
  VehicleAssetGallery,
} from "../types"
import { resolveAssetVariant, type ResponsiveAssetTarget } from "./asset-variant-builder"

const BADGES: Readonly<Partial<Record<Asset["type"], string>>> = {
  AI_IMAGE: "Image IA",
  THREE_SIXTY_SEQUENCE: "360°",
  PANORAMA: "Panorama",
}

export function buildAssetImageViewModel(
  asset: Asset,
  target: ResponsiveAssetTarget
): AssetImageViewModel | null {
  const variant = resolveAssetVariant(asset, target)
  if (!variant?.url) return null
  return {
    id: asset.id,
    alt: asset.metadata.alt?.trim() || "Visuel du véhicule",
    caption: asset.metadata.caption?.trim() || null,
    source: {
      url: variant.url,
      width: variant.width,
      height: variant.height,
      pixelDensity: variant.pixelDensity,
    },
    placeholder: {
      dominantColor: asset.metadata.dominantColor ?? null,
      blurHash: asset.metadata.blurHash ?? null,
    },
    badge: BADGES[asset.type] ?? null,
    status: asset.status,
  }
}

export function buildAssetGalleryViewModel(
  gallery: VehicleAssetGallery
): AssetGalleryViewModel | AssetPlaceholderViewModel {
  const assets = gallery.orderedAssets.flatMap((asset) => {
    const image = buildAssetImageViewModel(asset, "desktop")
    return image ? [image] : []
  })
  const cover = buildAssetImageViewModel(gallery.cover, "desktop")
  if (!cover || !assets.length) {
    return {
      empty: true,
      title: "Média indisponible",
      description: "Aucun visuel prêt à être affiché.",
      type: "IMAGE",
    }
  }
  return {
    empty: false,
    cover,
    assets,
    thumbnails: gallery.orderedAssets.flatMap((asset, index) => {
      const image = buildAssetImageViewModel(asset, "thumbnail")
      return image ? [{
        id: asset.id,
        image,
        selected: asset.id === gallery.cover.id,
        positionLabel: `Média ${index + 1} sur ${gallery.orderedAssets.length}`,
      }] : []
    }),
  }
}

export function buildAssetSeoViewModel(asset: Asset): AssetSeoViewModel | null {
  const image = buildAssetImageViewModel(asset, "retina")
  if (!image) return null
  return {
    alt: image.alt,
    caption: image.caption,
    openGraphImage: image.source.url,
    twitterImage: image.source.url,
    structuredImage: {
      "@type": "ImageObject",
      contentUrl: image.source.url,
      caption: image.caption,
      width: image.source.width,
      height: image.source.height,
    },
  }
}
