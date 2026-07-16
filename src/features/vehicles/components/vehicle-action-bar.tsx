import { Camera, CircleDollarSign, Pencil, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export function VehicleActionBar() {
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
      <Button variant="ghost" size="sm" disabled>
        <RefreshCw aria-hidden="true" />Changer le statut
      </Button>
    </nav>
  )
}
