import type { Asset } from "../types"

export interface AssetRepository {
  getById(assetId: string, garageId: string): Promise<Asset | null>
  listByVehicle(vehicleId: string, garageId: string): Promise<readonly Asset[]>
  save(asset: Asset): Promise<void>
  delete(assetId: string, garageId: string): Promise<void>
}
