import type { GaragePublicViewModel } from "../../types"
import type { VehicleCTASectionViewModel } from "../presentation"

export class VehicleCTASectionBuilder {
  build(
    garage: GaragePublicViewModel,
    vehicleTitle: string
  ): VehicleCTASectionViewModel {
    const contactHref = `${garage.homeHref}/contact?vehicle=${encodeURIComponent(vehicleTitle)}`
    return {
      title: "Ce véhicule vous intéresse ?",
      description: "Échangez directement avec notre équipe pour obtenir plus d’informations.",
      primary: garage.phone
        ? { label: "Téléphoner", href: `tel:${garage.phone.replace(/\s/g, "")}` }
        : { label: "Envoyer un message", href: contactHref },
      secondary: garage.phone
        ? { label: "Envoyer un message", href: contactHref }
        : null,
      placeholders: [
        { id: "test-drive", label: "Réserver un essai" },
        { id: "financing", label: "Demander un financement" },
        { id: "trade-in", label: "Estimer ma reprise" },
      ],
    }
  }
}
