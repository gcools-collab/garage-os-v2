import type { GaragePublicViewModel } from "../../types"
import type { VehicleCTASectionViewModel } from "../presentation"

export class VehicleCTASectionBuilder {
  build(
    garage: GaragePublicViewModel,
    vehicleTitle: string,
    vehicleSlug: string,
  ): VehicleCTASectionViewModel {
    const contactHref = `${garage.homeHref}/contact?vehicle=${encodeURIComponent(vehicleSlug)}`
    return {
      title: "Ce véhicule vous intéresse ?",
      description: "Échangez avec notre équipe. Une demande d’essai doit être confirmée par le garage : le créneau n’est jamais définitivement réservé.",
      primary: { label: "Nous contacter", href: `${contactHref}&project=buy` },
      secondary: { label: "Demander un essai", href: `${contactHref}&project=test-drive` },
      tertiary: { label: "Demander une reprise", href: `${contactHref}&project=trade-in` },
    }
  }
}
