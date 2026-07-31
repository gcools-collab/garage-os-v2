import { isPublicationTransitionAllowed } from "../engines"
import type {
  PublicationActionContract,
  PublicationReadiness,
  PublicationWorkflowStatus,
} from "../types"

type ActionDefinition = Omit<PublicationActionContract, "enabled">

const actions: readonly ActionDefinition[] = [
  {
    type: "PUBLISH",
    label: "Publier",
    targetStatus: "PUBLISHED",
    confirmationTitle: "Publier ce véhicule ?",
    confirmationDescription: "Le véhicule deviendra visible sur le site public.",
  },
  {
    type: "UNPUBLISH",
    label: "Dépublier",
    targetStatus: "IN_PREPARATION",
    confirmationTitle: "Dépublier ce véhicule ?",
    confirmationDescription: "Le véhicule ne sera plus visible publiquement.",
  },
  {
    type: "ARCHIVE",
    label: "Archiver",
    targetStatus: "ARCHIVED",
    confirmationTitle: "Archiver cette publication ?",
    confirmationDescription: "Le véhicule sera retiré de l’espace de publication actif.",
  },
  {
    type: "REACTIVATE",
    label: "Réactiver",
    targetStatus: "DRAFT",
    confirmationTitle: "Réactiver ce véhicule ?",
    confirmationDescription: "Le véhicule reviendra dans le workflow de préparation.",
  },
] as const

export class PublicationActionBuilder {
  build(
    status: PublicationWorkflowStatus,
    readiness: PublicationReadiness
  ): readonly PublicationActionContract[] {
    return actions.map((action) => ({
      ...action,
      enabled: isPublicationTransitionAllowed(status, action.targetStatus)
        && (action.type !== "PUBLISH" || readiness.canPublish),
    }))
  }
}
