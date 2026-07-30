import "server-only"

import { LeboncoinBridgeClient } from "@/features/market/providers/leboncoin/LeboncoinBridgeClient"
import { LeboncoinProvider } from "@/features/market/providers/leboncoin/LeboncoinProvider"
import { MarketplaceProvider } from "../providers"
import type { MarketProvider } from "../types"

export function createAcquisitionMarketProvider(): MarketProvider | null {
  const bridgeUrl = process.env.LEBONCOIN_BRIDGE_URL
  const apiKey = process.env.LEBONCOIN_BRIDGE_API_KEY
  if (!bridgeUrl || !apiKey) return null
  return new MarketplaceProvider(
    new LeboncoinProvider(new LeboncoinBridgeClient(bridgeUrl, apiKey))
  )
}
