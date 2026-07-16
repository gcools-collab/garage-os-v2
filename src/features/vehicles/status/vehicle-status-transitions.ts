import type { VehicleStatus } from "./vehicle-status"

const transitions: Record<VehicleStatus, readonly VehicleStatus[]> = {
  PURCHASED: ["PREPARATION", "ARCHIVED", "CANCELLED"],
  PREPARATION: ["PURCHASED", "READY_TO_PUBLISH", "ARCHIVED", "CANCELLED"],
  READY_TO_PUBLISH: ["PREPARATION", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["PREPARATION", "RESERVED", "ARCHIVED"],
  RESERVED: ["PUBLISHED", "SOLD", "ARCHIVED"],
  SOLD: ["DELIVERED", "ARCHIVED"],
  DELIVERED: ["ARCHIVED"],
  ARCHIVED: [],
  CANCELLED: ["ARCHIVED"],
}

export function getAllowedVehicleStatusTransitions(status: VehicleStatus) {
  return transitions[status]
}

export function isVehicleStatusTransitionAllowed(
  currentStatus: VehicleStatus,
  nextStatus: VehicleStatus
) {
  return transitions[currentStatus].includes(nextStatus)
}
