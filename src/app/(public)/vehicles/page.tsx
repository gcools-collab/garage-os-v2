import type { Metadata } from "next"
import {
  getLiveHomepage,
  getVehicleCatalog,
  normalizeCatalogSearchParams,
  PublicLayout,
  VehicleCatalogPage,
} from "@/features/public"
import type { RawCatalogSearchParams } from "@/features/public"

type CatalogPageProps = {
  searchParams: Promise<RawCatalogSearchParams>
}

async function getCatalog(searchParams: CatalogPageProps["searchParams"]) {
  return getVehicleCatalog(normalizeCatalogSearchParams(await searchParams))
}

export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  const { seo } = await getCatalog(searchParams)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    robots: seo.noIndex ? { index: false, follow: true } : undefined,
  }
}

export default async function VehiclesPage({ searchParams }: CatalogPageProps) {
  const [catalog, homepage] = await Promise.all([
    getCatalog(searchParams),
    Promise.resolve(getLiveHomepage()),
  ])
  return (
    <PublicLayout garage={homepage.garage} navigation={homepage.navigation} theme={homepage.theme}>
      <VehicleCatalogPage catalog={catalog} />
    </PublicLayout>
  )
}
