import { calculateVehicleProfitability } from "@/features/vehicles/utils"

export type FinancialVehicle = {
  purchase_price: number | string | null
  selling_price: number | string | null
  vehicle_costs: Array<{ amount: number | string | null }> | null
}

export function calculateExecutiveFinancialMetrics(vehicles: readonly FinancialVehicle[]) {
  const profitability = vehicles.map(calculateVehicleProfitability)
  const stockValue = vehicles.reduce(
    (total, vehicle) => total + Number(vehicle.selling_price ?? 0),
    0
  )
  const investedCapital = profitability.reduce(
    (total, vehicle) => total + vehicle.capitalInvested,
    0
  )
  const potentialMargin = profitability.reduce(
    (total, vehicle) => total + (vehicle.potentialMargin ?? 0),
    0
  )

  return {
    stockValue,
    investedCapital,
    potentialMargin,
    averageMargin: vehicles.length > 0 ? potentialMargin / vehicles.length : 0,
    vehicleCount: vehicles.length,
    investedCapitalShare: stockValue > 0 ? (investedCapital / stockValue) * 100 : null,
    potentialMarginRate: stockValue > 0 ? (potentialMargin / stockValue) * 100 : null,
  }
}
