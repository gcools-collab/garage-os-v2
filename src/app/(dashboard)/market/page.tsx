import { redirect } from "next/navigation"

import {
  buildMarketDashboardFromPersisted,
  MarketDashboardPage,
} from "@/features/market-intelligence"
import { getGarageMarketDashboardData } from "@/features/market-intelligence/data/market-dashboard-repository"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"

export default async function MarketPage() {
  const session = await getActiveGarageSession()
  if (!session) redirect("/auth/recover")
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/dashboard" || !session.garageId) redirect(destination)

  const record = await getGarageMarketDashboardData(session.garageId)
  const dashboard = buildMarketDashboardFromPersisted(record)

  return <MarketDashboardPage dashboard={dashboard} />
}
