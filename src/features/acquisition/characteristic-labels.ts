import type { DraftVehicleCharacteristics } from "./types"

type CharacteristicKey =
  | "fuel"
  | "gearbox"
  | "powerDin"
  | "color"
  | "doors"
  | "seats"

export const displayedCharacteristics: ReadonlyArray<{
  key: CharacteristicKey
  label: string
  format?: (value: string | number | boolean) => string
}> = [
  { key: "fuel", label: "Carburant" },
  { key: "gearbox", label: "Boîte de vitesses" },
  { key: "powerDin", label: "Puissance DIN", format: (value) => `${value} ch` },
  { key: "color", label: "Couleur" },
  { key: "doors", label: "Portes" },
  { key: "seats", label: "Places" },
]

export function getDisplayedCharacteristics(
  characteristics: DraftVehicleCharacteristics
) {
  return displayedCharacteristics.flatMap(({ key, label, format }) => {
    const value = characteristics[key]
    if (value === null || value === "") return []
    return [{ key, label, value: format ? format(value) : String(value) }]
  })
}
