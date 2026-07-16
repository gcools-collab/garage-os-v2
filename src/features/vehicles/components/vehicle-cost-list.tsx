"use client"

import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  vehicleCostCategoryLabels,
  type VehicleCostCategory,
} from "../cost-schema"
import { VehicleCostDeleteDialog } from "./vehicle-cost-delete-dialog"
import { VehicleCostForm, type EditableVehicleCost } from "./vehicle-cost-form"

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
})

const date = new Intl.DateTimeFormat("fr-FR")

export type VehicleCostListItem = EditableVehicleCost & {
  created_at: string
}

export function VehicleCostList({
  vehicleId,
  costs,
}: {
  vehicleId: string
  costs: VehicleCostListItem[]
}) {
  if (costs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Aucun coût enregistré.
      </div>
    )
  }

  return (
    <div className="divide-y">
      {costs.map((cost) => (
        <div key={cost.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="font-medium">{cost.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {vehicleCostCategoryLabels[cost.type as VehicleCostCategory]} · {date.format(new Date(`${cost.incurred_at}T00:00:00`))}
            </p>
            {cost.notes && <p className="mt-1 text-sm text-muted-foreground">{cost.notes}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-2 font-semibold">{currency.format(Number(cost.amount))}</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <Pencil className="size-4" aria-hidden="true" />
                  <span className="sr-only">Modifier {cost.label}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier le coût</DialogTitle>
                  <DialogDescription>Corrige les informations du frais engagé.</DialogDescription>
                </DialogHeader>
                <VehicleCostForm vehicleId={vehicleId} cost={cost} />
              </DialogContent>
            </Dialog>
            <VehicleCostDeleteDialog vehicleId={vehicleId} costId={cost.id} label={cost.label} />
          </div>
        </div>
      ))}
    </div>
  )
}
