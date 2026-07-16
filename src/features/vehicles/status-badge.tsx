import { Badge } from "@/components/ui/badge"

export type VehicleStatus =
  | "PURCHASED"
  | "PREPARATION"
  | "PUBLISHED"
  | "PRICE_DROP"
  | "MODIFIED"
  | "SOLD"

const labels: Record<VehicleStatus, string> = {
  PURCHASED: "Achat",
  PREPARATION: "Préparation",
  PUBLISHED: "Publié",
  PRICE_DROP: "Baisse prix",
  MODIFIED: "Modification",
  SOLD: "Vendu",
}

type StatusBadgeProps = {
  status: VehicleStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge>{labels[status]}</Badge>
}
