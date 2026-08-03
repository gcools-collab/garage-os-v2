import type { AssetImageViewModel } from "@/features/media"
import { MediaQualityEngine, MediaQualityReportBuilder, buildMediaQualityViewModel } from "@/features/media-quality"
import { Vehicle360SequenceEngine, Vehicle360ValidationEngine } from "../engine"
import type { Vehicle360EditorViewModel, Vehicle360PublicationViewModel, Vehicle360Sequence, Vehicle360ViewerViewModel } from "../types"

const statusLabels = { DRAFT: "Brouillon", PROCESSING: "Traitement", READY: "Prêt", PUBLISHED: "Publié", FAILED: "Erreur", ARCHIVED: "Archivé" } as const
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" })

function image(frame: Vehicle360Sequence["frames"][number], vehicleName: string): AssetImageViewModel | null {
  if (!frame.publicUrl) return null
  return {
    id: frame.id,
    alt: `${vehicleName} — vue extérieure 360°, image ${frame.position}`,
    caption: null,
    source: { url: frame.publicUrl, width: frame.width ?? undefined, height: frame.height ?? undefined },
    placeholder: { dominantColor: null, blurHash: null },
    badge: null,
    status: "READY",
  }
}

export class Vehicle360ViewerBuilder {
  build(sequence: Vehicle360Sequence, vehicleName: string): Vehicle360ViewerViewModel | null {
    const frames = new Vehicle360SequenceEngine().order(sequence.frames)
      .filter((frame) => frame.status === "READY")
      .flatMap((frame) => {
        const resolved = image(frame, vehicleName)
        return resolved ? [{ id: frame.id, position: frame.position, image: resolved }] : []
      })
    if (!frames.length) return null
    return {
      sequenceId: sequence.id,
      label: `Vue extérieure 360° de ${vehicleName}`,
      instructions: "Faites glisser pour faire tourner le véhicule. Utilisez les flèches du clavier pour avancer image par image.",
      frames,
      startIndex: Math.min(sequence.startFrameIndex ?? 0, frames.length - 1),
      previousLabel: "Image précédente",
      nextLabel: "Image suivante",
      resetLabel: "Revenir à l’image de départ",
      fullscreenLabel: "Afficher en plein écran",
      unavailableMessage: "Cette image est momentanément indisponible.",
    }
  }
}

export class Vehicle360GalleryBuilder {
  build(sequence: Vehicle360Sequence, vehicleName: string): Vehicle360EditorViewModel {
    const ordered = new Vehicle360SequenceEngine().order(sequence.frames)
    const qualityItems = ordered.map((frame) => ({ id: frame.id, position: frame.position, url: frame.publicUrl, width: frame.width, height: frame.height, fileSize: frame.fileSize, mimeType: frame.mimeType, hash: frame.checksum, ready: frame.status === "READY" }))
    const mediaQuality = buildMediaQualityViewModel(new MediaQualityReportBuilder().build(new MediaQualityEngine().analyze(qualityItems, "360"), null))
    return {
      sequenceId: sequence.id,
      vehicleId: sequence.vehicleId,
      statusLabel: statusLabels[sequence.status],
      frameCountLabel: `${ordered.filter((frame) => frame.status === "READY").length} image(s) prête(s)`,
      publicLabel: sequence.isPublic ? "Visible publiquement" : "Privée",
      updatedAtLabel: date.format(new Date(sequence.updatedAt)),
      coverage: new Vehicle360ValidationEngine().validate(sequence),
      viewer: new Vehicle360ViewerBuilder().build(sequence, vehicleName),
      frames: ordered.map((frame) => ({ id: frame.id, position: frame.position, positionLabel: `Image ${frame.position}`, status: frame.status, isStart: sequence.startFrameIndex === ordered.indexOf(frame), imageUrl: frame.publicUrl })),
      mediaQuality,
    }
  }
}

export class Vehicle360PublicationBuilder {
  build(sequence: Vehicle360Sequence | null, vehicleId: string): Vehicle360PublicationViewModel {
    if (!sequence) return { available: false, published: false, state: "NOT_APPLICABLE", label: "Aucune visite 360°", description: "La visite 360° est facultative.", href: `/stock/${vehicleId}/360` }
    if (sequence.status === "PUBLISHED" && sequence.isPublic) return { available: true, published: true, state: "PASS", label: "Visite 360° publiée", description: "La visite est visible sur la fiche publique.", href: `/stock/${vehicleId}/360` }
    const coverage = new Vehicle360ValidationEngine().validate(sequence)
    return { available: true, published: false, state: "WARNING", label: coverage.ready ? "Visite 360° prête à publier" : "Visite 360° incomplète", description: coverage.summary, href: `/stock/${vehicleId}/360` }
  }
}
