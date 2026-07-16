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
  | "fiscalPower"
  | "firstRegistrationDate"
  | "bodyType"
  | "upholstery"
  | "critAir"

export function formatFrenchDate(value: string | number | boolean) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value)
}

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
  {
    key: "fiscalPower",
    label: "Puissance fiscale",
    icon: Gauge,
    format: (value) => `${value} CV`,
  },
  {
    key: "firstRegistrationDate",
    label: "Première mise en circulation",
    icon: CarFront,
    format: formatFrenchDate,
  },
  { key: "bodyType", label: "Carrosserie", icon: CarFront },
  { key: "upholstery", label: "Sellerie", icon: Armchair },
  { key: "critAir", label: "Crit’Air", icon: CarFront },
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
