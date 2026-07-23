import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getLiveHomepage,
  getPublicVehicleSlugs,
  getVehicleDetailBySlug,
  PublicLayout,
  VehicleDetailPage,
} from "@/features/public"

type PublicVehiclePageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getPublicVehicleSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: PublicVehiclePageProps): Promise<Metadata> {
  const { slug } = await params
  const detail = getVehicleDetailBySlug(slug)
  if (!detail) {
    const { garage } = getLiveHomepage()
    return {
      title: `Véhicule introuvable | ${garage.siteName}`,
      description: "Ce véhicule n’est pas disponible dans le catalogue public.",
    }
  }
  return detail.seo
}

export default async function PublicVehiclePage({
  params,
}: PublicVehiclePageProps) {
  const { slug } = await params
  const detail = getVehicleDetailBySlug(slug)
  if (!detail) notFound()
  const homepage = getLiveHomepage()

  return (
    <PublicLayout
      garage={homepage.garage}
      navigation={homepage.navigation}
      theme={homepage.theme}
    >
      <VehicleDetailPage detail={detail} />
    </PublicLayout>
  )
}
