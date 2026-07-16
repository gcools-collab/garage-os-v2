import { Badge } from "@/components/ui/badge"
import {
  getVehicleStatusLabel,
  type VehicleStatus,
} from "./status/vehicle-status"

export {
  getVehicleStatusLabel,
  vehicleStatusLabels,
  type VehicleStatus,
} from "./status/vehicle-status"

type StatusBadgeProps = {
  status: VehicleStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant="secondary">{getVehicleStatusLabel(status)}</Badge>
}
