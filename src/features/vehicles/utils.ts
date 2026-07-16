export type VehicleCostAmount = {
  amount: number | string | null
}

export type VehicleProfitabilityInput = {
  purchase_price?: number | string | null
  market_price?: number | string | null
  vehicle_costs?: readonly VehicleCostAmount[] | null
}

export type VehicleProfitability = {
  costs: number
  investment: number
  margin: number
}

export function calculateTotalCosts(
  costs: readonly VehicleCostAmount[] | null | undefined
): number {
  return (
    costs?.reduce((total, cost) => total + Number(cost.amount), 0) ?? 0
  )
}

export function calculateVehicleMargin(
  vehicle: VehicleProfitabilityInput
): VehicleProfitability {
  const costs = calculateTotalCosts(vehicle.vehicle_costs)
  const investment = Number(vehicle.purchase_price ?? 0) + costs
  const margin = Number(vehicle.market_price ?? 0) - investment

  return {
    costs,
    investment,
    margin,
  }
}
