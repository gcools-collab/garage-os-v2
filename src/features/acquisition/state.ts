import type { DraftVehicle } from "./types"

export type AcquisitionActionState = {
  success: boolean
  message?: string
  draft?: DraftVehicle
  vehicleId?: string
  errors?: Record<string, string[] | undefined>
}

export const initialAcquisitionState: AcquisitionActionState = {
  success: false,
}
