export const publicStockCategories = ["particulier", "utilitaire"] as const

export type PublicStockCategory = (typeof publicStockCategories)[number]

const utilityKeywords = [
  "utilitaire",
  "fourgon",
  "fourgonnette",
  "camionnette",
  "camion",
  "pick-up",
  "pickup",
  "pick up",
  "lcv",
  "chassis cabine",
  "châssis cabine",
  "benne",
  "plateau",
] as const

const passengerKeywords = [
  "berline",
  "break",
  "suv",
  "coupe",
  "coupé",
  "cabriolet",
  "citadine",
  "monospace",
  "crossover",
  "compacte",
  "routiere",
  "routière",
  "4x4",
  "tout-terrain",
] as const

function normalizeBodyType(bodyType: string | null | undefined) {
  return bodyType
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? ""
}

function matchesKeyword(normalized: string, keyword: string) {
  const needle = normalizeBodyType(keyword)
  if (!normalized || !needle) return false
  if (normalized === needle) return true
  if (needle.length >= 4 && (normalized.includes(needle) || needle.includes(normalized))) return true
  return false
}

export function classifyPublicVehicleCategory(
  bodyType: string | null | undefined,
): PublicStockCategory | null {
  const normalized = normalizeBodyType(bodyType)
  if (!normalized) return null
  if (utilityKeywords.some((keyword) => matchesKeyword(normalized, keyword))) return "utilitaire"
  if (passengerKeywords.some((keyword) => matchesKeyword(normalized, keyword))) return "particulier"
  return null
}

export function isPublicStockCategory(value: string | undefined): value is PublicStockCategory {
  return value === "particulier" || value === "utilitaire"
}
