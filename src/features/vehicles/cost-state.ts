export type VehicleCostActionState = {
  success: boolean
  message?: string
  warning?: string
  errors?: Record<string, string[] | undefined>
}

export const initialVehicleCostActionState: VehicleCostActionState = {
  success: false,
}
