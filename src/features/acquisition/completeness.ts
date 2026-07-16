import type { DraftVehicle } from "./types"

export type CompletenessCheck = {
  label: string
  complete: boolean
  completeLabel?: string
}

export function getCompletenessChecks(
  draft: DraftVehicle,
  purchasePriceComplete: boolean
): CompletenessCheck[] {
  return [
    {
      label: "Photos",
      complete: draft.photos.length > 0,
      completeLabel: `${draft.photos.length} disponible(s)`,
    },
    {
      label: "Description",
      complete: Boolean(draft.description?.trim()),
      completeLabel: "Disponible",
    },
    { label: "Marque", complete: Boolean(draft.brand.trim()), completeLabel: "Identifiée" },
    { label: "Modèle", complete: Boolean(draft.model.trim()), completeLabel: "Identifié" },
    { label: "Année", complete: draft.year !== null, completeLabel: "Disponible" },
    { label: "Kilométrage", complete: draft.mileage !== null, completeLabel: "Disponible" },
    {
      label: "Carburant",
      complete: Boolean(draft.characteristics.fuel),
      completeLabel: "Identifié",
    },
    {
      label: "Boîte de vitesses",
      complete: Boolean(draft.characteristics.gearbox),
      completeLabel: "Identifiée",
    },
    { label: "Finition / version", complete: Boolean(draft.trim), completeLabel: "Identifiée" },
    {
      label: "Couleur",
      complete: Boolean(draft.characteristics.color),
      completeLabel: "Identifiée",
    },
    { label: "VIN", complete: false },
    { label: "Immatriculation", complete: false },
    {
      label: "Prix d'achat",
      complete: purchasePriceComplete,
      completeLabel: "Renseigné",
    },
  ]
}

export function getCompletenessPercentage(checks: readonly CompletenessCheck[]) {
  return Math.round(
    (checks.filter((check) => check.complete).length / checks.length) * 100
  )
}
