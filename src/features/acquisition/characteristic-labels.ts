import {
  Armchair,
  CarFront,
  DoorOpen,
  Fuel,
  Gauge,
  Palette,
  type LucideIcon,
} from "lucide-react"

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
  icon: LucideIcon
  format?: (value: string | number | boolean) => string
}> = [
  { key: "fuel", label: "Carburant", icon: Fuel },
  { key: "gearbox", label: "Boîte de vitesses", icon: CarFront },
  {
    key: "powerDin",
    label: "Puissance DIN",
    icon: Gauge,
    format: (value) => `${value} ch`,
  },
  { key: "color", label: "Couleur", icon: Palette },
  { key: "doors", label: "Portes", icon: DoorOpen },
  { key: "seats", label: "Places", icon: Armchair },
]

export function getDisplayedCharacteristics(
  characteristics: DraftVehicleCharacteristics
) {
  return displayedCharacteristics.flatMap(({ key, label, icon, format }) => {
    const value = characteristics[key]
    if (value === null || value === "") return []
    return [{ key, label, icon, value: format ? format(value) : String(value) }]
  })
}
