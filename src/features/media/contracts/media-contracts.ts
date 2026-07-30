import type { Asset, AssetImageViewModel, AssetVariant } from "../types"

export interface ThreeSixtyViewerContract {
  readonly sequence: readonly AssetImageViewModel[]
  readonly initialFrame: number
  readonly loop: boolean
}

export interface VideoPlayerContract {
  readonly assetId: string
  readonly source: AssetVariant
  readonly poster: AssetImageViewModel | null
}

export interface PdfViewerContract {
  readonly assetId: string
  readonly signedUrl: string
  readonly title: string
}

export interface AiAnnotationContract {
  readonly assetId: string
  readonly annotations: readonly {
    readonly id: string
    readonly label: string
    readonly confidence: number
    readonly x: number
    readonly y: number
  }[]
}

export interface ImageCompareContract {
  readonly before: AssetImageViewModel
  readonly after: AssetImageViewModel
  readonly initialPosition: number
}

export interface HotspotContract {
  readonly asset: Asset
  readonly hotspots: readonly {
    readonly id: string
    readonly x: number
    readonly y: number
    readonly label: string
    readonly targetAssetId: string | null
  }[]
}
