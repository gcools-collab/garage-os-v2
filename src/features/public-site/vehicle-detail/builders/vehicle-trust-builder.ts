import type { LiveStockVehicle } from "@/features/live-stock"
import type { GaragePublicViewModel } from "../../types"
import type { VehicleTrustViewModel } from "../presentation"

export class VehicleTrustBuilder {
  build(
    vehicle: LiveStockVehicle,
    garage: GaragePublicViewModel
  ): VehicleTrustViewModel {
    return {
      title: "Achetez en toute confiance",
      items: [
        {
          id: "professional",
          title: "Garage professionnel",
          description: `Véhicule proposé et accompagné par ${garage.name}.`,
        },
        vehicle.description ? {
          id: "transparent",
          title: "Présentation transparente",
          description: "Les informations disponibles sont présentées clairement.",
        } : null,
        vehicle.registrationDate ? {
          id: "history",
          title: "Historique renseigné",
          description: "La date de première mise en circulation est disponible.",
        } : null,
        {
          id: "support",
          title: "Accompagnement personnalisé",
          description: "Notre équipe répond à vos questions avant votre déplacement.",
        },
      ].filter((item): item is NonNullable<typeof item> => item !== null),
    }
  }
}
