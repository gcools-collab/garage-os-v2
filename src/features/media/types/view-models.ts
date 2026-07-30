import type { AssetStatus, AssetType } from "./asset"

export interface AssetImageSourceViewModel {
  readonly url: string
  readonly width?: number
  readonly height?: number
  readonly pixelDensity?: number
}

export interface AssetImageViewModel {
  readonly id: string
  readonly alt: string
  readonly caption: string | null
  readonly source: AssetImageSourceViewModel
  readonly placeholder: {
    readonly dominantColor: string | null
    readonly blurHash: string | null
  }
  readonly badge: string | null
  readonly status: AssetStatus
}

export interface AssetThumbnailViewModel {
  readonly id: string
  readonly image: AssetImageViewModel
  readonly selected: boolean
  readonly positionLabel: string
}

export interface AssetGalleryViewModel {
  readonly cover: AssetImageViewModel
  readonly assets: readonly AssetImageViewModel[]
  readonly thumbnails: readonly AssetThumbnailViewModel[]
  readonly empty: false
}

export interface AssetPlaceholderViewModel {
  readonly empty: true
  readonly title: string
  readonly description: string
  readonly type: AssetType
}

export interface AssetSeoViewModel {
  readonly alt: string
  readonly caption: string | null
  readonly openGraphImage: string
  readonly twitterImage: string
  readonly structuredImage: Readonly<Record<string, unknown>>
}
