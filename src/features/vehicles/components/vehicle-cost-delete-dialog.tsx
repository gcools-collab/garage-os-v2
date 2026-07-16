"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteVehicleCost } from "../cost-actions"
import type { VehicleCostActionState } from "../cost-state"

export function VehicleCostDeleteDialog({
  vehicleId,
  costId,
  label,
}: {
  vehicleId: string
  costId: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<VehicleCostActionState | null>(null)

  return (
    <div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="text-destructive">
            <Trash2 className="size-4" aria-hidden="true" />
            <span className="sr-only">Supprimer {label}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce coût ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le coût « {label} » sera définitivement supprimé. Cette action sera ajoutée à la timeline du véhicule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {result && !result.success && (
            <p className="text-sm text-destructive" role="alert">{result.message}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                startTransition(async () => {
                  const deletion = await deleteVehicleCost(costId, vehicleId)
                  setResult(deletion)
                  if (deletion.success) setOpen(false)
                })
              }}
            >
              {pending ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {result?.success && result.warning && (
        <p className="mt-1 text-xs text-amber-700" role="status">{result.warning}</p>
      )}
    </div>
  )
}
