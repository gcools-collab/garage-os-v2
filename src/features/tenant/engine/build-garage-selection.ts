import type { ActiveGarageSession, GarageSelectionViewModel } from "../types"

const roleLabels: Readonly<Record<string, string>> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
}

export function buildGarageSelection(session: ActiveGarageSession): GarageSelectionViewModel {
  return {
    title: "Choisir un établissement",
    description: "Sélectionnez le garage que vous souhaitez piloter.",
    emptyMessage: "Aucun garage autorisé n’est disponible pour cette session.",
    garages: session.availableGarages.map((garage) => ({
      garageId: garage.garageId,
      garageName: garage.garageName,
      garageSlug: garage.garageSlug,
      roleLabel: roleLabels[garage.memberRole] ?? garage.memberRole,
      cityLabel: garage.city,
    })),
  }
}
