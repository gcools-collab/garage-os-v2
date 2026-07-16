export type VehicleCostAmount = {
  amount: number | string | null
}

export type VehicleProfitabilityInput = {
  purchase_price?: number | string | null
  selling_price?: number | string | null
  vehicle_costs?: readonly VehicleCostAmount[] | null
}

export type VehicleProfitability = {
  totalCosts: number
  capitalInvested: number
  potentialMargin: number | null
}

export function calculateTotalCosts(
  costs: readonly VehicleCostAmount[] | null | undefined
): number {
  return (
    costs?.reduce((total, cost) => total + Number(cost.amount), 0) ?? 0
  )
}

export function calculateVehicleProfitability(
  vehicle: VehicleProfitabilityInput
): VehicleProfitability {
  const totalCosts = calculateTotalCosts(vehicle.vehicle_costs)
  const capitalInvested = Number(vehicle.purchase_price ?? 0) + totalCosts
  const potentialMargin =
    vehicle.selling_price == null
      ? null
      : Number(vehicle.selling_price) - capitalInvested

  return {
    totalCosts,
    capitalInvested,
    potentialMargin,
  }
}
