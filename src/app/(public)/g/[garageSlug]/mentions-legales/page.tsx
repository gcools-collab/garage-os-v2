import { notFound } from "next/navigation"
import { buildGaragePublicViewModel, getPublicSiteRecord, PublicLegalPage } from "@/features/public-site"

export default async function LegalPage({ params }: { readonly params: Promise<{ readonly garageSlug: string }> }) {
  const { garageSlug } = await params
  const record = await getPublicSiteRecord(garageSlug)
  if (!record) notFound()
  return <PublicLegalPage garage={buildGaragePublicViewModel(record.garage)} kind="legal" />
}
