import { buildMarketDashboard, marketListingsFixture, MarketDashboardPage } from "@/features/market-intelligence"
import { vehicles } from "@/features/public/data"

export default function MarketPage() {
  const dashboard = buildMarketDashboard({ vehicles, listings: marketListingsFixture })
  return <MarketDashboardPage dashboard={dashboard} />
}
