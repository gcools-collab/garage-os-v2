import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  normalizeCatalogSearchParams,
  PublicLayout,
  VehicleCatalogPage,
  type RawCatalogSearchParams,
} from "@/features/public"
import { getPublicLiveCatalog } from "@/features/live-stock"

type GarageCatalogPageProps = {
  params: Promise<{ garageSlug: string }>
  searchParams: Promise<RawCatalogSearchParams>
}

async function loadCatalog(props: GarageCatalogPageProps) {
  const [{ garageSlug }, searchParams] = await Promise.all([props.params, props.searchParams])
  return getPublicLiveCatalog(garageSlug, normalizeCatalogSearchParams(searchParams))
}

export async function generateMetadata(props: GarageCatalogPageProps): Promise<Metadata> {
  const result = await loadCatalog(props)
  if (!result) return { title: "Catalogue indisponible", robots: { index: false } }
  return {
    title: result.catalog.seo.title,
    description: result.catalog.seo.description,
    alternates: { canonical: result.catalog.seo.canonicalPath },
    robots: result.catalog.seo.noIndex ? { index: false, follow: true } : undefined,
  }
}

export default async function GarageCatalogPage(props: GarageCatalogPageProps) {
  const result = await loadCatalog(props)
  if (!result) notFound()
  return (
    <PublicLayout
      garage={result.homepage.garage}
      navigation={result.homepage.navigation}
      theme={result.homepage.theme}
    >
      <VehicleCatalogPage catalog={result.catalog} />
    </PublicLayout>
  )
}
