import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  CollectionsSection,
  FeaturedVehiclesSection,
  Hero,
  PublicLayout,
} from "@/features/public"
import { getPublicLiveHomepage } from "@/features/live-stock"
import { buildLiveMetadata } from "@/features/theme"

type GarageLivePageProps = {
  params: Promise<{ garageSlug: string }>
}

export async function generateMetadata({ params }: GarageLivePageProps): Promise<Metadata> {
  const { garageSlug } = await params
  const result = await getPublicLiveHomepage(garageSlug)
  if (!result) return { title: "Site indisponible", robots: { index: false } }
  const metadata = buildLiveMetadata({
    branding: result.garage.branding,
    theme: result.garage.liveTheme,
    page: {},
  })
  return {
    title: metadata.title,
    description: metadata.description,
    icons: metadata.icons ?? undefined,
    themeColor: metadata.themeColor,
    alternates: { canonical: result.garage.basePath },
  }
}

export default async function GarageLivePage({ params }: GarageLivePageProps) {
  const { garageSlug } = await params
  const result = await getPublicLiveHomepage(garageSlug)
  if (!result) notFound()
  const { homepage } = result
  return (
    <PublicLayout garage={homepage.garage} navigation={homepage.navigation} theme={homepage.theme}>
      <Hero hero={homepage.hero} />
      <CollectionsSection collections={homepage.collections} />
      <FeaturedVehiclesSection vehicles={homepage.featuredVehicles} />
    </PublicLayout>
  )
}
