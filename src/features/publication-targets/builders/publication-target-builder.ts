import { publicationTargetCapabilities } from "../types"
import type { PublicationTargetEngineResult } from "../engines"
import type {
  PublicationTargetsViewModel,
  PublicationTargetViewModel,
} from "../presentation"
import type {
  PublicationTargetCapability,
  PublicationTargetHealth,
  PublicationTargetStatus,
  PublicationTargetValidationState,
} from "../types"

const capabilityLabels: Readonly<Record<PublicationTargetCapability, string>> = {
  PHOTOS: "Photos",
  VIDEO: "Vidéo",
  "360": "Vue 360°",
  PRICE: "Prix",
  DESCRIPTION: "Description",
  EQUIPMENT: "Équipements",
  SEO: "SEO",
  CONTACT: "Contact",
  FINANCING: "Financement",
  REPRISE: "Reprise",
}

const statusLabels: Readonly<Record<PublicationTargetStatus, string>> = {
  NOT_CONFIGURED: "Non configuré",
  READY: "Prêt",
  PUBLISHED: "Publié",
  OUTDATED: "À mettre à jour",
  ERROR: "En erreur",
  NOT_IMPLEMENTED: "Non implémenté",
}

const healthLabels: Readonly<Record<PublicationTargetHealth, string>> = {
  ONLINE: "Disponible",
  OFFLINE: "Indisponible",
  DEGRADED: "Dégradé",
  UNKNOWN: "Inconnu",
}

const validationLabels: Readonly<Record<PublicationTargetValidationState, string>> = {
  PASS: "Validé",
  WARNING: "Avertissement",
  BLOCKER: "Bloquant",
}

export class PublicationTargetBuilder {
  build(result: PublicationTargetEngineResult): PublicationTargetsViewModel {
    const targets: readonly PublicationTargetViewModel[] = result.analyses.map((analysis) => ({
      id: analysis.target.id,
      name: analysis.target.name,
      description: analysis.target.description,
      status: analysis.preview.status,
      statusLabel: statusLabels[analysis.preview.status],
      health: analysis.health,
      healthLabel: healthLabels[analysis.health],
      canPublish: analysis.canPublish,
      preview: {
        url: analysis.preview.simulatedUrl,
        title: analysis.preview.title,
        cover: analysis.preview.cover,
        description: analysis.preview.description,
      },
      capabilities: publicationTargetCapabilities.map((capability) => ({
        id: capability,
        label: capabilityLabels[capability],
        supported: analysis.target.capabilities.includes(capability),
      })),
      validations: analysis.validations.map((item) => ({
        id: item.id,
        label: item.label,
        state: item.state,
        stateLabel: validationLabels[item.state],
        message: item.message,
      })),
    }))
    return {
      targets,
      publishableCount: result.publishableCount,
      summary: result.publishableCount === 0
        ? "Aucune destination n’est prête à publier."
        : `${result.publishableCount} destination${result.publishableCount > 1 ? "s" : ""} prête${result.publishableCount > 1 ? "s" : ""} à publier.`,
    }
  }
}
