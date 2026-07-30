import { redirect } from "next/navigation"
import {
  buildGarageDailyBriefViewModel,
  GarageIntelligenceBriefPage,
  INTELLIGENCE_RECOMMENDATION_STATUSES,
  INTELLIGENCE_SIGNAL_CATEGORIES,
  refreshGarageRecommendations,
  type IntelligenceRecommendationStatus,
  type IntelligenceSignalCategory,
} from "@/features/intelligence"
import { getActiveGarageSession } from "@/features/tenant"

export default async function IntelligencePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly category?: string; readonly status?: string }>
}) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const params = await searchParams
  const category = INTELLIGENCE_SIGNAL_CATEGORIES.includes(params.category as IntelligenceSignalCategory)
    ? params.category as IntelligenceSignalCategory
    : undefined
  const status = INTELLIGENCE_RECOMMENDATION_STATUSES.includes(params.status as IntelligenceRecommendationStatus)
    ? params.status as IntelligenceRecommendationStatus
    : "ACTIVE"
  const brief = await refreshGarageRecommendations(session)
  return <GarageIntelligenceBriefPage brief={buildGarageDailyBriefViewModel(brief, { category, status })} />
}
