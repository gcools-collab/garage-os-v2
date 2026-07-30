import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { buildAcquisitionDetail } from "@/features/acquisition/builders"
import { OpportunityDetail, OpportunityForm } from "@/features/acquisition/components"
import { updateAcquisitionOpportunity } from "@/features/acquisition/actions/opportunity-actions"
import {
  buildPurchaseRecommendationViewModel,
  getAcquisitionRecommendation,
  PurchaseRecommendationCard,
} from "@/features/acquisition/recommendation"
import {
  AcquisitionMarketCard,
  buildAcquisitionMarketViewModel,
} from "@/features/acquisition/market"
import {
  AcquisitionMarketAiCard,
  AcquisitionMarketAiSection,
} from "@/features/acquisition/market/ai"
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
  const { opportunity, recommendation, marketAnalysis } = record
  return <main className="space-y-10">
    <OpportunityDetail detail={buildAcquisitionDetail(opportunity)} />
    <section aria-labelledby="deterministic-analysis" className="space-y-4">
      <div>
        <h2 id="deterministic-analysis" className="text-2xl font-semibold">Analyse chiffrée</h2>
        <p className="text-sm text-muted-foreground">Calculs déterministes fondés sur les données déclarées et les annonces réellement collectées.</p>
      </div>
      <AcquisitionMarketCard market={buildAcquisitionMarketViewModel(marketAnalysis)} />
      <PurchaseRecommendationCard
        recommendation={buildPurchaseRecommendationViewModel(recommendation)}
      />
    </section>
    <section aria-labelledby="ai-analysis" className="space-y-4">
      <h2 id="ai-analysis" className="text-2xl font-semibold">Analyse IA</h2>
      <Suspense fallback={<AcquisitionMarketAiCard insight={{
        available: false,
        title: "Analyse IA",
        description: "Enrichissement en cours…",
        confidenceLabel: null,
        summary: null,
        positiveSignals: [],
        riskSignals: [],
        extractedFacts: [],
        recommendedChecks: [],
        negotiationArguments: [],
        limitations: [],
      }} />}>
        <AcquisitionMarketAiSection
          opportunity={opportunity}
          market={marketAnalysis}
        />
      </Suspense>
    </section>
    <section className="space-y-4">
      <div><h2 className="text-2xl font-semibold">Modifier le dossier</h2><p className="text-sm text-muted-foreground">Les corrections restent propres à l’opportunité.</p></div>
      <OpportunityForm action={updateAcquisitionOpportunity.bind(null, opportunity.id)} opportunity={opportunity} />
    </section>
  </main>
}
