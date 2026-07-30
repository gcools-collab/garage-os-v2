import { notFound, redirect } from "next/navigation"
import { buildAcquisitionDetail } from "@/features/acquisition/builders"
import { OpportunityDetail, OpportunityForm } from "@/features/acquisition/components"
import { updateAcquisitionOpportunity } from "@/features/acquisition/actions/opportunity-actions"
import {
  buildPurchaseRecommendationViewModel,
  getAcquisitionRecommendation,
  PurchaseRecommendationCard,
} from "@/features/acquisition/recommendation"
import { getActiveGarageSession } from "@/features/tenant"

export default async function AcquisitionOpportunityPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>
}) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const { id } = await params
  const record = await getAcquisitionRecommendation(session, id)
  if (!record) notFound()
  const { opportunity, recommendation } = record
  return <main className="space-y-10">
    <OpportunityDetail detail={buildAcquisitionDetail(opportunity)} />
    <PurchaseRecommendationCard
      recommendation={buildPurchaseRecommendationViewModel(recommendation)}
    />
    <section className="space-y-4">
      <div><h2 className="text-2xl font-semibold">Modifier le dossier</h2><p className="text-sm text-muted-foreground">Les corrections restent propres à l’opportunité.</p></div>
      <OpportunityForm action={updateAcquisitionOpportunity.bind(null, opportunity.id)} opportunity={opportunity} />
    </section>
  </main>
}
