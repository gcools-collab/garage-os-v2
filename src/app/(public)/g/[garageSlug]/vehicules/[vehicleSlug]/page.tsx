import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import {
  getPublicSiteRecord,
  PremiumVehicleDetailPage,
  VehicleDetailPageBuilder,
} from "@/features/public-site"
import { Vehicle360ViewerBuilder } from "@/features/vehicle-360"
import { getPublicVehicle360Sequence } from "@/features/vehicle-360/repositories"

export const revalidate = 300

type Props = {
  readonly params: Promise<{
    readonly garageSlug: string
    readonly vehicleSlug: string
  }>
}

const loadDetail = cache(async (garageSlug: string, vehicleSlug: string) => {
  const record = await getPublicSiteRecord(garageSlug)
  if (!record) return null
  const vehicle = record.vehicles.find((candidate) => candidate.slug === vehicleSlug)
  return vehicle
    ? new VehicleDetailPageBuilder().build({ garage: record.garage, vehicle })
    : null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { garageSlug, vehicleSlug } = await params
  const detail = await loadDetail(garageSlug, vehicleSlug)
  if (!detail) return { title: "Véhicule introuvable", robots: { index: false } }
  return {
    title: detail.seo.title,
    description: detail.seo.description,
    alternates: { canonical: detail.seo.canonicalPath },
    openGraph: {
      type: "website",
      title: detail.seo.title,
      description: detail.seo.description,
      images: detail.seo.openGraphImage ? [detail.seo.openGraphImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: detail.seo.title,
      description: detail.seo.description,
      images: detail.seo.twitterImage ? [detail.seo.twitterImage] : undefined,
    },
  }
}

function jsonLd(value: Readonly<Record<string, unknown>>) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export default async function PremiumVehicleRoute({ params }: Props) {
  const { garageSlug, vehicleSlug } = await params
  const detail = await loadDetail(garageSlug, vehicleSlug)
  if (!detail) notFound()
  const record = await getPublicSiteRecord(garageSlug)
  const vehicle = record?.vehicles.find((candidate) => candidate.slug === vehicleSlug)
  const sequence = vehicle && record
    ? await getPublicVehicle360Sequence(record.garage.garageId, vehicle.id)
    : null
  const vehicle360 = sequence && vehicle
    ? new Vehicle360ViewerBuilder().build(sequence, `${vehicle.make} ${vehicle.model}`)
    : null
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(detail.seo.breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(detail.seo.vehicleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(detail.seo.localBusinessJsonLd) }} />
      {detail.seo.imageJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(detail.seo.imageJsonLd.structuredImage) }} />
      ) : null}
      <PremiumVehicleDetailPage detail={detail} vehicle360={vehicle360} />
    </>
  )
}
