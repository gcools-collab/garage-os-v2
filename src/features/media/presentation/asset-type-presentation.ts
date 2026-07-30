import type { AssetType } from "../types"

export interface AssetTypePresentation {
  readonly label: string
  readonly renderKind: "IMAGE" | "VIDEO" | "DOCUMENT" | "INTERACTIVE"
}

export const ASSET_TYPE_PRESENTATION: Readonly<Record<AssetType, AssetTypePresentation>> = {
  IMAGE: { label: "Image", renderKind: "IMAGE" },
  VIDEO: { label: "Vidéo", renderKind: "VIDEO" },
  DOCUMENT: { label: "Document", renderKind: "DOCUMENT" },
  PDF: { label: "PDF", renderKind: "DOCUMENT" },
  YOUTUBE: { label: "YouTube", renderKind: "VIDEO" },
  THREE_SIXTY_SEQUENCE: { label: "Séquence 360°", renderKind: "INTERACTIVE" },
  PANORAMA: { label: "Panorama", renderKind: "INTERACTIVE" },
  HOTSPOT: { label: "Point interactif", renderKind: "INTERACTIVE" },
  AI_IMAGE: { label: "Image IA", renderKind: "IMAGE" },
  AI_REPORT: { label: "Rapport IA", renderKind: "DOCUMENT" },
}
