import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicLayout, VehicleDetailPage } from "@/features/public"
import { getPublicLiveVehicleDetail } from "@/features/live-stock"
import {
  buildVehicleLeadContactActions,
  PublicVehicleLeadForm,
} from "@/features/leads"

type GarageVehiclePageProps = {
  params: Promise<{ garageSlug: string; vehicleSlug: string }>
}

export async function generateMetadata({ params }: GarageVehiclePageProps): Promise<Metadata> {
  const { garageSlug, vehicleSlug } = await params
  const result = await getPublicLiveVehicleDetail(garageSlug, vehicleSlug)
  if (!result) return { title: "Véhicule introuvable", robots: { index: false } }
  return {
    title: result.detail.seo.title,
    description: result.detail.seo.description,
    alternates: {
      canonical: `${result.garage.basePath}/vehicules/${encodeURIComponent(vehicleSlug)}`,
    },
    openGraph: {
      title: result.detail.seo.title,
      description: result.detail.seo.description,
      images: result.detail.primaryImage ? [result.detail.primaryImage.url] : undefined,
    },
  }
}

export default async function GarageVehiclePage({ params }: GarageVehiclePageProps) {
  const { garageSlug, vehicleSlug } = await params
  const result = await getPublicLiveVehicleDetail(garageSlug, vehicleSlug)
  if (!result) notFound()
  const publicPageUrl = `${result.garage.basePath}/vehicules/${encodeURIComponent(vehicleSlug)}`
  const detail = {
    ...result.detail,
    contactActions: buildVehicleLeadContactActions({
      phone: result.garage.branding.phone,
      email: result.garage.branding.email,
      vehicleTitle: result.detail.displayName,
      publicUrl: publicPageUrl,
    }),
  }
  return (
    <PublicLayout
      garage={result.homepage.garage}
      navigation={result.homepage.navigation}
      theme={result.homepage.theme}
    >
      <VehicleDetailPage
        detail={detail}
        leadForm={
          <PublicVehicleLeadForm
            garageSlug={garageSlug}
            vehicleSlug={vehicleSlug}
            vehicleTitle={detail.displayName}
            publicPageUrl={publicPageUrl}
          />
        }
      />
    </PublicLayout>
  )
}
