export const vehicleStockCategories = ["PARTICULIER", "UTILITAIRE"] as const

export type VehicleStockCategory = (typeof vehicleStockCategories)[number]

export const vehicleStockCategoryLabels = {
  PARTICULIER: "Véhicule particulier",
  UTILITAIRE: "Véhicule utilitaire",
} as const satisfies Record<VehicleStockCategory, string>

export function isVehicleStockCategory(value: unknown): value is VehicleStockCategory {
  return value === "PARTICULIER" || value === "UTILITAIRE"
}

export function parseVehicleStockCategory(value: unknown): VehicleStockCategory | null {
  return isVehicleStockCategory(value) ? value : null
}
