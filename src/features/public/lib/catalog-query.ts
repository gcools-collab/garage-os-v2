import type { LiveCatalogSort, LiveVehicleCatalogQuery } from "../types"

export type RawCatalogSearchParams = Record<
  string,
  string | string[] | undefined
>

const catalogSorts: LiveCatalogSort[] = [
  "recommended",
  "price-asc",
  "price-desc",
  "newest",
  "mileage-asc",
]

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function textValue(value: string | string[] | undefined) {
  const text = firstValue(value)?.trim()
  return text || undefined
}

function positiveNumber(value: string | string[] | undefined, integer = false) {
  const parsed = Number(firstValue(value))
  if (!Number.isFinite(parsed) || parsed < (integer ? 1 : 0)) return undefined
  return integer ? Math.floor(parsed) : parsed
}

export function normalizeCatalogSearchParams(
  params: RawCatalogSearchParams
): LiveVehicleCatalogQuery {
  const sort = textValue(params.sort)
  const query: LiveVehicleCatalogQuery = {}
  const textEntries = [
    ["q", textValue(params.q)],
    ["collection", textValue(params.collection)],
    ["brand", textValue(params.brand)],
    ["fuel", textValue(params.fuel)],
    ["gearbox", textValue(params.gearbox)],
  ] as const
  for (const [key, value] of textEntries) {
    if (value !== undefined) query[key] = value
  }
  const minPrice = positiveNumber(params.minPrice)
  const maxPrice = positiveNumber(params.maxPrice)
  const page = positiveNumber(params.page, true)
  if (minPrice !== undefined) query.minPrice = minPrice
  if (maxPrice !== undefined) query.maxPrice = maxPrice
  if (page !== undefined) query.page = page
  if (catalogSorts.includes(sort as LiveCatalogSort)) query.sort = sort as LiveCatalogSort
  return query
}

export function buildCatalogHref(
  query: LiveVehicleCatalogQuery,
  changes: Partial<Record<keyof LiveVehicleCatalogQuery, string | number | undefined>>
) {
  const next = { ...query, ...changes }
  const params = new URLSearchParams()
  for (const key of [
    "q",
    "collection",
    "brand",
    "fuel",
    "gearbox",
    "minPrice",
    "maxPrice",
    "sort",
    "page",
  ] as const) {
    const value = next[key]
    if (value !== undefined && value !== "" && !(key === "sort" && value === "recommended") && !(key === "page" && value === 1)) {
      params.set(key, String(value))
    }
  }
  const search = params.toString()
  return search ? `/vehicles?${search}` : "/vehicles"
}
