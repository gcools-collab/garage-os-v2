import { Camera, CircleDollarSign, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { VehicleStatusDialog } from "../status/vehicle-status-dialog"
import type { VehicleStatus } from "../status/vehicle-status"

export function VehicleActionBar({
  vehicleId,
  currentStatus,
}: {
  vehicleId: string
  currentStatus: VehicleStatus
}) {
  return (
    <nav
      aria-label="Actions du véhicule"
      className="flex flex-wrap gap-2 rounded-xl border bg-white p-2 shadow-xs"
    >
      <Button asChild variant="ghost" size="sm">
        <a href="#vehicle-information"><Pencil aria-hidden="true" />Modifier</a>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <a href="#vehicle-costs"><CircleDollarSign aria-hidden="true" />Ajouter un coût</a>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <a href="#vehicle-photos"><Camera aria-hidden="true" />Ajouter des photos</a>
      </Button>
      <VehicleStatusDialog vehicleId={vehicleId} currentStatus={currentStatus} />
    </nav>
  )
}
