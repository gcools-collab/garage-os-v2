import type { LiveStockVehicle } from "@/features/live-stock"
import type {
  PublicationWorkflowStatus,
} from "../types"

const labels: Readonly<Record<PublicationWorkflowStatus, string>> = {
  DRAFT: "Brouillon",
  IN_PREPARATION: "En préparation",
  READY: "Prêt à publier",
  PUBLISHED: "Publié",
  RESERVED: "Réservé",
  SOLD: "Vendu",
  ARCHIVED: "Archivé",
}

export class PublicationStatusBuilder {
  resolve(vehicle: LiveStockVehicle): PublicationWorkflowStatus {
    if (vehicle.status === "ARCHIVED" || vehicle.status === "CANCELLED") return "ARCHIVED"
    if (vehicle.status === "SOLD" || vehicle.status === "DELIVERED") return "SOLD"
    if (vehicle.status === "RESERVED") return "RESERVED"
    if (vehicle.publicationStatus === "PUBLISHED") return "PUBLISHED"
    if (vehicle.status === "READY_TO_PUBLISH") return "READY"
    if (vehicle.status === "PREPARATION") return "IN_PREPARATION"
    return "DRAFT"
  }

  build(status: PublicationWorkflowStatus) {
    return {
      status,
      label: labels[status],
      description: status === "PUBLISHED"
        ? "Le véhicule est visible sur le site public."
        : status === "READY"
          ? "Tous les blocages sont levés : la publication peut être décidée."
          : "Le véhicule reste privé tant que sa publication n’est pas validée.",
    } as const
  }
}
