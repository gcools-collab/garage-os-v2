import { isPublicationTransitionAllowed } from "../engines"
import type {
  PublicationActionContract,
  PublicationReadiness,
  PublicationWorkflowStatus,
} from "../types"

type ActionDefinition = Omit<PublicationActionContract, "enabled">

const actions: readonly ActionDefinition[] = [
  { type: "MARK_READY", label: "Valider la préparation", targetStatus: "READY", confirmationTitle: "Valider la préparation ?", confirmationDescription: "Le véhicule sera déclaré prêt à publier." },
  { type: "PUBLISH", label: "Publier", targetStatus: "PUBLISHED", confirmationTitle: "Publier ce véhicule ?", confirmationDescription: "Le véhicule deviendra visible sur le site public." },
  { type: "UNPUBLISH", label: "Dépublier", targetStatus: "READY", confirmationTitle: "Dépublier ce véhicule ?", confirmationDescription: "Le véhicule ne sera plus visible publiquement." },
  { type: "RESERVE", label: "Réserver", targetStatus: "RESERVED", confirmationTitle: "Marquer ce véhicule comme réservé ?", confirmationDescription: "La réservation sera enregistrée dans le cycle de publication." },
  { type: "SELL", label: "Marquer vendu", targetStatus: "SOLD", confirmationTitle: "Marquer ce véhicule comme vendu ?", confirmationDescription: "Le véhicule sera retiré du catalogue public." },
  { type: "ARCHIVE", label: "Archiver", targetStatus: "ARCHIVED", confirmationTitle: "Archiver ce véhicule ?", confirmationDescription: "Le véhicule quittera définitivement le cycle actif." },
] as const

export class PublicationActionBuilder {
  build(
    status: PublicationWorkflowStatus,
    readiness: PublicationReadiness
  ): readonly PublicationActionContract[] {
    return actions.map((action) => ({
      ...action,
      enabled: isPublicationTransitionAllowed(status, action.targetStatus)
        && (!["MARK_READY", "PUBLISH"].includes(action.type) || readiness.canPublish),
    }))
  }
}
