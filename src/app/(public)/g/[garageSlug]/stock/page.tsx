import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  buildPublicSeo,
  buildPublicStock,
  getPublicSiteRecord,
  PublicStockPage,
  isPublicStockCategory,
  type PublicStockQuery,
  type PublicStockSort,
} from "@/features/public-site"

type RawParams = Readonly<Record<string, string | string[] | undefined>>
type Props = {
  readonly params: Promise<{ readonly garageSlug: string }>
  readonly searchParams: Promise<RawParams>
}
const sorts = new Set<PublicStockSort>(["newest", "price-asc", "price-desc", "year-desc", "mileage-asc"])
const text = (value: string | string[] | undefined) => typeof value === "string" && value.trim() ? value.trim() : undefined
const number = (value: string | string[] | undefined) => {
  const parsed = Number(text(value))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}
function query(raw: RawParams): PublicStockQuery {
  const sort = text(raw.sort)
  return {
    brand: text(raw.brand), model: text(raw.model), fuel: text(raw.fuel),
    gearbox: text(raw.gearbox), bodyType: text(raw.bodyType),
    category: (() => {
      const category = text(raw.category)
      return isPublicStockCategory(category) ? category : undefined
    })(),
    minPrice: number(raw.minPrice), maxPrice: number(raw.maxPrice),
    minYear: number(raw.minYear), maxMileage: number(raw.maxMileage),
    sort: sort && sorts.has(sort as PublicStockSort) ? sort as PublicStockSort : "newest",
    page: number(raw.page),
  }
}
async function load(props: Props) {
  const [{ garageSlug }, raw] = await Promise.all([props.params, props.searchParams])
  const record = await getPublicSiteRecord(garageSlug)
  return record ? buildPublicStock(record.garage, record.vehicles, query(raw)) : null
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const stock = await load(props)
  if (!stock) return { title: "Stock indisponible", robots: { index: false } }
  const seo = buildPublicSeo({ garage: stock.garage, pageTitle: "Stock automobile", description: stock.description, canonicalPath: `${stock.garage.homeHref}/stock` })
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonicalPath } }
}
export default async function GaragePublicStock(props: Props) {
  const stock = await load(props)
  if (!stock) notFound()
  return <PublicStockPage stock={stock} />
}
