import { Badge } from "@/components/ui/badge"

export type VehicleStatus =
  | "PURCHASED"
  | "PREPARATION"
  | "PUBLISHED"
  | "PRICE_DROP"
  | "MODIFIED"
  | "SOLD"

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  PURCHASED: "Acheté",
  PREPARATION: "En préparation",
  PUBLISHED: "Publié",
  PRICE_DROP: "Baisse de prix",
  MODIFIED: "Modifié",
  SOLD: "Vendu",
}

export function getVehicleStatusLabel(status: VehicleStatus) {
  return vehicleStatusLabels[status]
}

type StatusBadgeProps = {
  status: VehicleStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant="secondary">{getVehicleStatusLabel(status)}</Badge>
}
