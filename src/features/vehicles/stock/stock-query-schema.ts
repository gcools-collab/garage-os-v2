import { z } from "zod"

import { vehicleStatusSchema } from "../status/vehicle-status"

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value

const single = <T extends z.ZodType>(schema: T) => z.preprocess(firstValue, schema)

export const stockSorts = [
  "recent",
  "oldest",
  "purchase-asc",
  "purchase-desc",
  "selling-asc",
  "selling-desc",
  "mileage-asc",
  "mileage-desc",
  "margin-asc",
  "margin-desc",
] as const

export type StockSort = (typeof stockSorts)[number]

const booleanParameter = single(
  z.enum(["true", "false"]).default("false").transform((value) => value === "true")
).catch(false)

export const stockQuerySchema = z.object({
  q: single(z.string().trim().max(100).default("")).catch(""),
  status: single(vehicleStatusSchema.optional()).catch(undefined),
  sort: single(z.enum(stockSorts).default("recent")).catch("recent"),
  page: single(z.coerce.number().int().min(1).default(1)).catch(1),
  missingPurchasePrice: booleanParameter,
  missingSellingPrice: booleanParameter,
  missingVin: booleanParameter,
  missingRegistration: booleanParameter,
  missingPhoto: booleanParameter,
  missingCost: booleanParameter,
  marketplaceImported: booleanParameter,
  online: booleanParameter,
})

export type StockQuery = z.infer<typeof stockQuerySchema>

export type RawStockSearchParams = Record<string, string | string[] | undefined>

export function parseStockQuery(searchParams: RawStockSearchParams): StockQuery {
  return stockQuerySchema.parse(searchParams)
}

export const stockOperationalFilterKeys = [
  "missingPurchasePrice",
  "missingSellingPrice",
  "missingVin",
  "missingRegistration",
  "missingPhoto",
  "missingCost",
  "marketplaceImported",
  "online",
] as const

export type StockOperationalFilterKey = (typeof stockOperationalFilterKeys)[number]

export const stockOperationalFilterLabels: Record<StockOperationalFilterKey, string> = {
  missingPurchasePrice: "Sans prix d’achat",
  missingSellingPrice: "Sans prix de vente",
  missingVin: "Sans VIN",
  missingRegistration: "Sans immatriculation",
  missingPhoto: "Sans photo",
  missingCost: "Sans coût enregistré",
  marketplaceImported: "Importé d’une marketplace",
  online: "Présent en ligne",
}

export function stockQueryToSearchParams(query: StockQuery) {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.status) params.set("status", query.status)
  if (query.sort !== "recent") params.set("sort", query.sort)
  if (query.page > 1) params.set("page", String(query.page))
  for (const key of stockOperationalFilterKeys) {
    if (query[key]) params.set(key, "true")
  }
  return params
}
