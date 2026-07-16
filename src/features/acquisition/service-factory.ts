import { LeboncoinAcquisitionProvider } from "./providers/leboncoin-provider"
import { VehicleAcquisitionService } from "./vehicle-acquisition-service"

export function createVehicleAcquisitionService() {
  const bridgeUrl = process.env.LEBONCOIN_BRIDGE_URL
  const apiKey = process.env.LEBONCOIN_BRIDGE_API_KEY

  if (!bridgeUrl || !apiKey) {
    throw new Error("Le bridge Leboncoin n'est pas configuré.")
  }

  return new VehicleAcquisitionService([
    new LeboncoinAcquisitionProvider(bridgeUrl, apiKey),
  ])
}
